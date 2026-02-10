import { NextRequest, NextResponse } from 'next/server';
import { getPhotoUrlByRollNo } from '@/lib/googleDriveHelper';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rollNo = searchParams.get('rollNo');

    if (!rollNo) {
        return new NextResponse('No roll number provided', { status: 400 });
    }

    try {
        // Get the actual Google Drive URL
        const driveUrl = await getPhotoUrlByRollNo(rollNo);

        if (!driveUrl) {
            return new NextResponse('Photo not found', { status: 404 });
        }

        // Fetch the image from Google Drive on the server side
        const imageRes = await fetch(driveUrl);

        if (!imageRes.ok) {
            return new NextResponse('Failed to fetch image from Drive', { status: imageRes.status });
        }

        // Get the image data
        const imageBuffer = await imageRes.arrayBuffer();

        // Create response with appropriate headers
        const headers = new Headers();
        headers.set('Content-Type', imageRes.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        return new NextResponse(Buffer.from(imageBuffer), { headers });

    } catch (error) {
        console.error('Photo Proxy Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
