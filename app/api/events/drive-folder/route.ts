import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const data = eventDoc.data();
        return NextResponse.json({
            success: true,
            driveFolderId: data?.driveFolderId || '',
            driveFolderLink: data?.driveFolderId ? `https://drive.google.com/drive/folders/${data.driveFolderId}` : ''
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { eventId, driveUrl } = await req.json();

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        let folderId = '';

        if (driveUrl && driveUrl.trim()) {
            // Extract Folder ID from URL
            // Maches: https://drive.google.com/drive/folders/1PK7i7LfBJYwwjGh95JzCvN6l8YDetHJvZsHu3fUvwkKSb5tjfOZ0UK7JyeWT0YZAJ6UHbwnp
            // Or just the ID itself if pasted
            const match = driveUrl.match(/[-\w]{25,}/);
            if (match) {
                folderId = match[0];
            } else {
                return NextResponse.json({ error: 'Invalid Google Drive Folder URL' }, { status: 400 });
            }
        }

        // Update the event document
        await adminDb.collection('events').doc(eventId).update({
            driveFolderId: folderId
        });

        return NextResponse.json({
            success: true,
            message: folderId ? 'Drive Folder Linked Successfully' : 'Drive Folder Removed',
            driveFolderId: folderId
        });

    } catch (error: any) {
        console.error('Error updating drive folder:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
