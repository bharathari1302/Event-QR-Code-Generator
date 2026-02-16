import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, subEventName, driveLink, googleSheetId, googleSheetName, syncSubType, syncMealName } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const updateData: any = {};

        if (subEventName !== undefined) updateData.sub_event_name = subEventName;
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

        await adminDb.collection('events').doc(eventId).update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Event settings saved successfully.'
        });

    } catch (error: any) {
        console.error('Error updating event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
