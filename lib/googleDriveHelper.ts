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
    rollMap: Map<string, string>;
    nameMap: Map<string, string>;
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
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        if (!apiKey) {
            console.warn('Google API Key not configured. Photo fetching will be limited.');
            return [];
        }

        let allFiles: DriveFile[] = [];
        let nextPageToken: string | undefined = undefined;

        console.log(`[FetchPhotoList] Starting fetch for folder: ${folderId}`);

        do {
            const fetchUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=nextPageToken,files(id,name)${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&pageSize=1000`;

            const apiResponse: Response = await fetch(fetchUrl);
            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.error(`[FetchPhotoList] API Error: ${errorText}`);
                break;
            }

            const data: { files?: DriveFile[], nextPageToken?: string } = await apiResponse.json();
            if (data.files) {
                allFiles = allFiles.concat(data.files);
            }
            nextPageToken = data.nextPageToken;
            console.log(`[FetchPhotoList] Fetched batch. Total so far: ${allFiles.length}`);
        } while (nextPageToken);

        console.log(`[FetchPhotoList] Total files fetched: ${allFiles.length}`);
        return allFiles;
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
 * Normalizes a name for matching (lowercase, alphanumeric only)
 */
function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Builds the cache of roll numbers to file IDs for a specific folder
 */
async function buildPhotoCache(folderId: string): Promise<void> {
    console.log(`[PhotoCache] Building cache for folder: ${folderId}`);
    const files = await fetchPhotoList(folderId);
    console.log(`[PhotoCache] Fetched ${files.length} files from folder`);

    const rollMap = new Map<string, string>();
    const nameMap = new Map<string, string>();

    files.forEach((file) => {
        const cleanName = file.name.replace(/\.(jpg|jpeg|png|webp|pdf)$/i, '');

        // 1. Try Roll Number
        const rollNo = extractRollNoFromFilename(file.name);
        if (rollNo) {
            rollMap.set(rollNo, file.id);
        }

        // 2. Map by Full Name (no extension, normalized)
        const fullNormalized = normalizeName(cleanName);
        if (fullNormalized) {
            if (!nameMap.has(fullNormalized)) {
                nameMap.set(fullNormalized, file.id);
            }
        }

        // 3. Map by Name without Roll (if roll found in filename)
        if (rollNo) {
            const nameWithoutRoll = cleanName.replace(new RegExp(rollNo, 'gi'), '').trim();
            const partNormalized = normalizeName(nameWithoutRoll);
            if (partNormalized && partNormalized.length > 2 && !nameMap.has(partNormalized)) {
                nameMap.set(partNormalized, file.id);
            }
        }
    });

    driveCaches.set(folderId, {
        rollMap,
        nameMap,
        timestamp: Date.now()
    });

    console.log(`[PhotoCache] Built for ${folderId}: ${rollMap.size} roll entries, ${nameMap.size} name entries`);
}

/**
 * Gets the photo URL for a given roll number or name
 * Returns null if photo not found
 */
export async function getParticipantPhotoUrl(
    rollNo: string | null | undefined,
    name: string | null | undefined,
    eventFolderId?: string
): Promise<string | null> {
    const folderId = eventFolderId || DEFAULT_DRIVE_FOLDER_ID;

    // Get cache entry for this folder
    let cache = driveCaches.get(folderId);

    // Refresh cache if not exists or expired
    if (!cache || Date.now() - cache.timestamp > CACHE_DURATION) {
        await buildPhotoCache(folderId);
        cache = driveCaches.get(folderId);
    }

    if (!cache) return null;

    let fileId: string | undefined = undefined;

    // 1. Seek by Roll Number (highest confidence)
    if (rollNo) {
        fileId = cache.rollMap.get(rollNo.toUpperCase());
    }

    // 2. Seek by Exact Normalized Name (fallback)
    if (!fileId && name) {
        const normName = normalizeName(name);
        fileId = cache.nameMap.get(normName);

        // 3. Fuzzy Match (if exact name fails)
        if (!fileId && normName.length > 3) {
            for (const [cachedName, id] of cache.nameMap.entries()) {
                if (cachedName.includes(normName) || normName.includes(cachedName)) {
                    fileId = id;
                    console.log(`[DriveHelper] Fuzzy Match Found: Search [${normName}] Matched [${cachedName}]`);
                    break;
                }
            }
        }
    }

    if (!fileId) {
        return null;
    }

    // Return Google Drive Direct API media URL (more reliable for server-side proxy)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
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
        size: driveCaches.get(k)?.rollMap.size || 0,
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
    const firstFolderId = Array.from(driveCaches.keys())[0];
    if (!firstFolderId) return [];
    const map = driveCaches.get(firstFolderId)?.rollMap;
    if (!map) return [];
    return Array.from(map.keys()).slice(0, limit);
}
