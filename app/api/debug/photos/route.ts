import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getPhotoUrlByRollNo, refreshPhotoCache, getCacheStats, getSampleCacheKeys } from '@/lib/googleDriveHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rollNo = searchParams.get('rollNo');
        const refresh = searchParams.get('refresh');
        const testApi = searchParams.get('testApi');

        // Test Google Drive API directly
        if (testApi === 'true') {
            // Store original TLS setting
            const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

            try {
                // Temporarily disable strict TLS validation for Google API calls
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
                const folderId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID;

                if (!apiKey || !folderId) {
                    return NextResponse.json({
                        error: 'Missing API key or folder ID',
                        env: {
                            apiKey: apiKey ? 'Set' : 'MISSING',
                            folderId: folderId ? 'Set' : 'MISSING'
                        }
                    });
                }

                const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType)`;

                try {
                    const response = await fetch(url);
                    const data = await response.json();

                    return NextResponse.json({
                        apiUrl: url.replace(apiKey, 'API_KEY_HIDDEN'),
                        responseStatus: response.status,
                        responseOk: response.ok,
                        data: data,
                        fileCount: data.files ? data.files.length : 0,
                        debugFiles: data.files ? data.files.slice(0, 20).map((f: any) => ({ name: f.name, mimeType: f.mimeType })) : []
                    });
                } catch (apiError: any) {
                    return NextResponse.json({
                        error: 'API request failed',
                        message: apiError.message,
                        stack: apiError.stack
                    }, { status: 500 });
                }
            } finally {
                // Restore original TLS setting
                if (originalRejectUnauthorized !== undefined) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
                } else {
                    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
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
                    photoUrl: await getPhotoUrlByRollNo(p.rollNo),
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
            const photoUrl = await getPhotoUrlByRollNo(rollNo);
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
        const testRollNumbers = ['24ALR004', '24ALR047', '24ALR018', '24ALR027', '24ALR011'];
        const results = await Promise.all(
            testRollNumbers.map(async (rollNo) => ({
                rollNo,
                photoUrl: await getPhotoUrlByRollNo(rollNo),
            }))
        );

        return NextResponse.json({
            message: 'Photo URL test results',
            results,
            testRollNoMatched: rollNo ? results.find(r => r.rollNo === rollNo) : null,
            cacheStats: {
                ...cacheStats,
                sampleKeys: getSampleCacheKeys(100)
            },
            env: {
                folderId: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ? 'Set' : 'Not Set',
                apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'Set' : 'Not Set',
            }
        });

    } catch (error: any) {
        console.error('Photo Test Error:', error);
        return NextResponse.json(
            {
                error: error.message,
                stack: error.stack
            },
            { status: 500 }
        );
    }
}
