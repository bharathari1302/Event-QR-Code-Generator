import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, subEventName, driveLink, googleSheetId, googleSheetName, syncSubType, syncMealName } = body;
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const updateData: any = {};

        if (subEventName !== undefined) updateData.subEvents = [subEventName]; // Ensure it translates nicely if schema demands array, but we can store it flexibly
        if (googleSheetId !== undefined) updateData.googleSheetId = googleSheetId;
        if (googleSheetName !== undefined) updateData.googleSheetName = googleSheetName;
        if (syncSubType !== undefined) updateData.syncSubType = syncSubType;
        if (syncMealName !== undefined) updateData.syncMealName = syncMealName;

        // Drive Link Logic
        if (driveLink !== undefined) {
            if (driveLink && driveLink.trim()) {
                const match = driveLink.match(/[-\w]{25,}/);
                if (match) {
                    updateData.driveFolderId = match[0];
                    updateData.driveFolderLink = driveLink; // Save the full link too for UI convenience
                } else {
                    return NextResponse.json({ error: 'Invalid Google Drive Folder URL' }, { status: 400 });
                }
            } else {
                updateData.driveFolderId = '';
                updateData.driveFolderLink = '';
            }
        }

        await connectDB();
        const updatedEvent = await Event.findOneAndUpdate(
            { _id: eventId, adminId },
            updateData,
            { new: true }
        );

        if (!updatedEvent) {
            return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Event settings saved successfully.'
        });

    } catch (error: any) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
