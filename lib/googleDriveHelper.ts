/**
 * Google Drive Photo Helper
 * Manages photo access from Google Drive folder for participant verification
 */
import fs from 'fs';
import path from 'path';

// Google Drive folder ID from environment (Default fallback)
const DEFAULT_DRIVE_FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || '1PK7i7LfBJYwwjGh95JzCvN6l8YDetHJvZsHu3fUvwkKSb5tjfOZ0UK7JyeWT0YZAJ6UHbwnp';

// Multi-folder cache: Map<FolderID, CacheEntry>
interface CacheEntry {
    map: Map<string, string>;
    timestamp: number;
}

const driveCaches = new Map<string, CacheEntry>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface DriveFile {
    id: string;
    name: string;
}

/**
 * Fetches the list of files from Google Drive folder
 * Uses the public folder sharing URL to access file list
 */
async function fetchPhotoList(folderId: string): Promise<DriveFile[]> {
    // Store original TLS setting to restore later
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

    try {
        // Temporarily disable strict TLS validation for Google API calls
        // This fixes DECODER routines error in Node.js 18+ production environments
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // Use Google Drive API v3 public endpoint to list files in folder
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('Google API Key not configured. Photo fetching will be limited.');
            return [];
        }

        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;
        console.log(`[FetchPhotoList] Calling Google Drive API for folder: ${folderId}`);

        const response = await fetch(url);
        console.log(`[FetchPhotoList] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[FetchPhotoList] API Error: ${errorText}`);
            throw new Error(`Failed to fetch photo list: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[FetchPhotoList] Received ${data.files?.length || 0} files`);
        return data.files || [];
    } catch (error) {
        console.error(`Error fetching photo list from Google Drive (Folder: ${folderId}):`, error);
        return [];
    } finally {
        // Restore original TLS setting
        if (originalRejectUnauthorized !== undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
    }
}

/**
 * Extracts roll number from filename
 * Supports formats: 
 * - "12345.jpg"
 * - "12345-Name.jpg"
 * - "12345 - Name 12345.jpg"
 * - "24ALR004 - BHARAT HARI S 24ALR004.jpg"
 */
function extractRollNoFromFilename(filename: string): string | null {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp|pdf)$/i, '');

    // 1. Try to find a specific Roll Number pattern anywhere in the string
    // Pattern: 24 (year) + 2 or 3 letters (Dept) + 3 numbers (No)
    // Examples: 24ALR004, 23CSD012, 22ME001
    const rollPattern = /([0-9]{2}[A-Z]{2,3}[0-9]{3})/i;
    const match = nameWithoutExt.match(rollPattern);
    if (match) {
        return match[1].toUpperCase();
    }

    // 2. Fallback: Try alphanumeric code at the end (usual for student renamed files)
    const endMatch = nameWithoutExt.match(/[\s-_]([A-Z0-9]{5,})$/i);
    if (endMatch) {
        return endMatch[1].toUpperCase();
    }

    // 3. Last Fallback: Try anything at the start that's not just numbers (avoid dates)
    const startMatch = nameWithoutExt.match(/^([A-Z]+[0-9]+|[0-9]+[A-Z]+[A-Z0-9]*)/i);
    if (startMatch) {
        // Only return if it's not a long date-like number (e.g. 20250515)
        if (!/^[0-9]{8}$/.test(startMatch[1])) {
            return startMatch[1].toUpperCase();
        }
    }

    return null;
}

/**
 * Builds the cache of roll numbers to file IDs for a specific folder
 */
async function buildPhotoCache(folderId: string): Promise<void> {
    console.log(`[PhotoCache] Building cache for folder: ${folderId}`);
    const files = await fetchPhotoList(folderId);
    console.log(`[PhotoCache] Fetched ${files.length} files from folder`);

    const newMap = new Map<string, string>();

    files.forEach((file, index) => {
        const rollNo = extractRollNoFromFilename(file.name);
        if (rollNo) {
            newMap.set(rollNo, file.id);
            if (index < 5) { // Log first 5 for debugging
                console.log(`[PhotoCache] Mapped: "${file.name}" -> Roll No: "${rollNo}"`);
            }
        } else {
            if (index < 5) { // Log first 5 failed extractions
                console.log(`[PhotoCache] Could not extract roll no from: "${file.name}"`);
            }
        }
    });

    driveCaches.set(folderId, {
        map: newMap,
        timestamp: Date.now()
    });

    console.log(`Photo cache built for folder ${folderId} with ${newMap.size} entries`);
}

/**
 * Gets the photo URL for a given roll number
 * Returns null if photo not found
 * @param rollNo The participant's roll number
 * @param eventFolderId Optional specific folder ID for this event. detailed default env var used if not provided.
 */
export async function getPhotoUrlByRollNo(rollNo: string | null | undefined, eventFolderId?: string): Promise<string | null> {
    if (!rollNo) {
        return null;
    }

    // Determine which folder to use
    const folderId = eventFolderId || DEFAULT_DRIVE_FOLDER_ID;

    // Get cache entry for this folder
    let cache = driveCaches.get(folderId);

    // Refresh cache if not exists or expired
    if (!cache || Date.now() - cache.timestamp > CACHE_DURATION) {
        await buildPhotoCache(folderId);
        cache = driveCaches.get(folderId);
    }

    const fileId = cache?.map.get(rollNo);

    // Log to file for debugging
    try {
        const logMsg = `[DriveHelper] ${new Date().toISOString()} - RollNo: ${rollNo}, Folder: ${folderId}, CacheSize: ${cache?.map.size}, Found: ${!!fileId}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'debug-photo.log'), logMsg);
    } catch (e) { console.error('Log error', e); }

    console.log(`[DriveHelper] distinct lookup for ${rollNo} in ${folderId}. Cache size: ${cache?.map.size}. Found: ${!!fileId}`);

    if (!fileId) {
        // console.log(`No photo found for roll number: ${rollNo} in folder ${folderId}`);
        return null;
    }

    // Return Google Drive direct view URL
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Validates if a photo URL is accessible
 */
export async function validatePhotoUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Manually refreshes the photo cache for a specific folder (or default)
 */
export async function refreshPhotoCache(eventFolderId?: string): Promise<void> {
    const folderId = eventFolderId || DEFAULT_DRIVE_FOLDER_ID;
    await buildPhotoCache(folderId);
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats() {
    const folders = Array.from(driveCaches.keys()).map(k => ({
        folderId: k,
        size: driveCaches.get(k)?.map.size || 0,
        age: Date.now() - (driveCaches.get(k)?.timestamp || 0)
    }));

    return {
        totalFolders: driveCaches.size,
        folders
    };
}

/**
 * Gets sample keys from the cache for debugging
 */
export function getSampleCacheKeys(limit: number = 10): string[] {
    if (driveCaches.size === 0) return [];
    const firstFolderId = driveCaches.keys().next().value;
    if (!firstFolderId) return [];
    const map = driveCaches.get(firstFolderId)?.map;
    if (!map) return [];
    return Array.from(map.keys()).slice(0, limit);
}
