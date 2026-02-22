import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getParticipantPhotoUrl, refreshPhotoCache, getCacheStats, getSampleCacheKeys } from '@/lib/googleDriveHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rollNo = searchParams.get('rollNo');
        const refresh = searchParams.get('refresh');
        const testApi = searchParams.get('testApi');

        // Test Google Drive API directly
        if (testApi === 'true') {
            const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            try {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
                const folderId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

                if (!apiKey || !folderId) {
                    return NextResponse.json({
                        error: 'Missing API key or folder ID'
                    });
                }

                const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType)`;
                const response = await fetch(url);
                const data = await response.json();

                return NextResponse.json({
                    responseStatus: response.status,
                    fileCount: data.files ? data.files.length : 0,
                    debugFiles: data.files ? data.files.slice(0, 10) : []
                });
            } finally {
                if (originalRejectUnauthorized !== undefined) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
                }
            }
        }

        // Refresh cache if requested
        if (refresh === 'true') {
            await refreshPhotoCache();
        }

        // Get cache stats
        const cacheStats = getCacheStats();

        const name = searchParams.get('name');
        if (name) {
            const participantsRef = adminDb.collection('participants');
            const snapshot = await participantsRef.where('name', '>=', name).where('name', '<=', name + '\uf8ff').limit(10).get();
            const participants = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));

            const resultsWithName = await Promise.all(
                participants.map(async (p: any) => ({
                    name: p.name,
                    rollNo: p.rollNo,
                    photoUrl: await getParticipantPhotoUrl(p.rollNo, p.name),
                }))
            );

            return NextResponse.json({
                searchName: name,
                results: resultsWithName,
                cacheStats: {
                    ...cacheStats,
                    sampleKeys: getSampleCacheKeys(100)
                }
            });
        }

        // Test with specific roll number
        if (rollNo) {
            const photoUrl = await getParticipantPhotoUrl(rollNo, null);
            return NextResponse.json({
                rollNo,
                photoUrl,
                found: !!photoUrl,
                cacheStats: {
                    ...cacheStats,
                    sampleKeys: getSampleCacheKeys(100)
                }
            });
        }

        // Test with sample roll numbers from database
        const testRollNumbers = ['24ALR004', '24ALR047', '24ALR091', '24ALR005', '24ITR100'];
        const results = await Promise.all(
            testRollNumbers.map(async (roll) => ({
                rollNo: roll,
                photoUrl: await getParticipantPhotoUrl(roll, null),
            }))
        );

        return NextResponse.json({
            message: 'Photo URL test results',
            results,
            cacheStats: {
                ...cacheStats,
                sampleKeys: getSampleCacheKeys(100)
            }
        });

    } catch (error: any) {
        console.error('Photo Test Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
