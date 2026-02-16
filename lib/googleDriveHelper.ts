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

const caches = new Map<string, CacheEntry>();
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
    try {
        // Use Google Drive API v3 public endpoint to list files in folder
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('Google API Key not configured. Photo fetching will be limited.');
            return [];
        }

        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name)`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch photo list: ${response.statusText}`);
        }

        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error(`Error fetching photo list from Google Drive (Folder: ${folderId}):`, error);
        return [];
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
    const nameWithoutExt = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '');

    // 1. Try to extract roll number at the start
    // Supports formats like: "24ALR004", "12345", "ALR004", etc.
    const startMatch = nameWithoutExt.match(/^([A-Z0-9]{5,})/i);
    if (startMatch) {
        return startMatch[1].toUpperCase();
    }

    // 2. If not found at start, try to extract from the END
    // Supports formats like: "IMG-20250318-WA0054 - ADITHYA T 24CDR007"
    // Look for alphanumeric code at the end, possibly preceded by spaces or dashes
    const endMatch = nameWithoutExt.match(/[\s-_]([A-Z0-9]{5,})$/i);
    if (endMatch) {
        return endMatch[1].toUpperCase();
    }

    // 3. Fallback: Try looser match at start if specific length check failed
    const looseStartMatch = nameWithoutExt.match(/^([A-Z0-9]+)/i);
    if (looseStartMatch) {
        return looseStartMatch[1].toUpperCase();
    }

    return null;
}

/**
 * Builds the cache of roll numbers to file IDs for a specific folder
 */
async function buildPhotoCache(folderId: string): Promise<void> {
    const files = await fetchPhotoList(folderId);
    const newMap = new Map<string, string>();

    files.forEach(file => {
        const rollNo = extractRollNoFromFilename(file.name);
        if (rollNo) {
            newMap.set(rollNo, file.id);
        }
    });

    caches.set(folderId, {
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
    let cache = caches.get(folderId);

    // Refresh cache if not exists or expired
    if (!cache || Date.now() - cache.timestamp > CACHE_DURATION) {
        await buildPhotoCache(folderId);
        cache = caches.get(folderId);
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
    // Return stats for all caches combined or just a summary
    return {
        totalFolders: caches.size,
        folders: Array.from(caches.keys()).map(k => ({
            folderId: k,
            size: caches.get(k)?.map.size || 0,
            age: Date.now() - (caches.get(k)?.timestamp || 0)
        }))
    };
}
