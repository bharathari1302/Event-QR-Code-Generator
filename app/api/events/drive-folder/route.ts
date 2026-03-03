import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        await connectDB();
        const event = await Event.findById(eventId).lean() as any;

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            driveFolderId: event?.driveFolderId || '',
            driveFolderLink: event?.driveFolderId ? `https://drive.google.com/drive/folders/${event.driveFolderId}` : ''
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
            const match = driveUrl.match(/[-\w]{25,}/);
            if (match) {
                folderId = match[0];
            } else {
                return NextResponse.json({ error: 'Invalid Google Drive Folder URL' }, { status: 400 });
            }
        }

        await connectDB();
        await Event.findByIdAndUpdate(eventId, {
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
