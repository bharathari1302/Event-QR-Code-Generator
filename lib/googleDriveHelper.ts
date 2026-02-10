/**
 * Google Drive Photo Helper
 * Manages photo access from Google Drive folder for participant verification
 */

// Google Drive folder ID from environment
const DRIVE_FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || '1PK7i7LfBJYwwjGh95JzCvN6l8YDetHJvZsHu3fUvwkKSb5tjfOZ0UK7JyeWT0YZAJ6UHbwnp';

// In-memory cache for roll number to file ID mapping
let photoCache: Map<string, string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface DriveFile {
    id: string;
    name: string;
}

/**
 * Fetches the list of files from Google Drive folder
 * Uses the public folder sharing URL to access file list
 */
async function fetchPhotoList(): Promise<DriveFile[]> {
    try {
        // Use Google Drive API v3 public endpoint to list files in folder
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

        if (!apiKey) {
            console.warn('Google API Key not configured. Photo fetching will be limited.');
            return [];
        }

        const url = `https://www.googleapis.com/drive/v3/files?q='${DRIVE_FOLDER_ID}'+in+parents&key=${apiKey}&fields=files(id,name)`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch photo list: ${response.statusText}`);
        }

        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error('Error fetching photo list from Google Drive:', error);
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

    // Try to extract roll number - look for alphanumeric pattern at the start
    // Supports formats like: "24ALR004", "12345", "ALR004", etc.
    const match = nameWithoutExt.match(/^([A-Z0-9]+)/i);

    if (match) {
        return match[1].toUpperCase();
    }

    return null;
}

/**
 * Builds the cache of roll numbers to file IDs
 */
async function buildPhotoCache(): Promise<void> {
    const files = await fetchPhotoList();
    const newCache = new Map<string, string>();

    files.forEach(file => {
        const rollNo = extractRollNoFromFilename(file.name);
        if (rollNo) {
            newCache.set(rollNo, file.id);
        }
    });

    photoCache = newCache;
    cacheTimestamp = Date.now();

    console.log(`Photo cache built with ${newCache.size} entries`);
}

/**
 * Gets the photo URL for a given roll number
 * Returns null if photo not found
 */
export async function getPhotoUrlByRollNo(rollNo: string | null | undefined): Promise<string | null> {
    if (!rollNo) {
        return null;
    }

    // Refresh cache if expired or not initialized
    if (!photoCache || Date.now() - cacheTimestamp > CACHE_DURATION) {
        await buildPhotoCache();
    }

    const fileId = photoCache?.get(rollNo);

    if (!fileId) {
        console.log(`No photo found for roll number: ${rollNo}`);
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
 * Manually refreshes the photo cache
 * Call this when new photos are added to the Drive folder
 */
export async function refreshPhotoCache(): Promise<void> {
    await buildPhotoCache();
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheStats() {
    return {
        size: photoCache?.size || 0,
        age: photoCache ? Date.now() - cacheTimestamp : 0,
        isValid: photoCache !== null && Date.now() - cacheTimestamp < CACHE_DURATION
    };
}
