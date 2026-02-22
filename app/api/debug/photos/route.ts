import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getParticipantPhotoUrl, refreshPhotoCache, getCacheStats, getSampleCacheKeys } from '@/lib/googleDriveHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rollNo = searchParams.get('rollNo');
        const name = searchParams.get('name');
        const eventId = searchParams.get('eventId');
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
                    return NextResponse.json({ error: 'Missing API key or folder ID' });
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
            await refreshPhotoCache(eventId || undefined);
        }

        // Get cache stats
        const cacheStats = getCacheStats();

        // Search for specific student results
        if (name || rollNo) {
            const photoUrl = await getParticipantPhotoUrl(rollNo, name, eventId || undefined);

            // Search in DB to get full context
            let dbData = null;
            if (rollNo) {
                const snap = await adminDb.collection('participants').where('rollNo', '==', rollNo.toUpperCase()).get();
                if (!snap.empty) dbData = snap.docs[0].data();
            } else if (name) {
                const snap = await adminDb.collection('participants').where('name', '==', name).get();
                if (!snap.empty) dbData = snap.docs[0].data();
            }

            return NextResponse.json({
                search: { rollNo, name, eventId },
                found: !!photoUrl,
                photoUrl,
                dbData,
                cacheStats
            });
        }

        // Default results
        return NextResponse.json({
            message: 'Photo Debug API',
            cacheStats,
            sampleRollKeys: getSampleCacheKeys(50)
        });

    } catch (error: any) {
        console.error('Photo Test Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
