import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    const rollNo = url.searchParams.get('rollNo')?.trim().toUpperCase();

    if (!eventId || !rollNo) {
        return NextResponse.json({ error: 'Event ID and Roll No are required' }, { status: 400 });
    }

    try {
        await connectDB();

        const participant = await Participant.findOne({
            event_id: eventId,
            rollNo: rollNo
        }).lean();

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found in this event' }, { status: 404 });
        }

        return NextResponse.json({
            id: participant._id.toString(),
            name: participant.name,
            rollNo: participant.rollNo,
            email: participant.email,
            department: participant.department,
            status: participant.status
        });

    } catch (error: any) {
        console.error('Search Participant Error:', error);
        return NextResponse.json({ error: 'Failed to search participant' }, { status: 500 });
    }
}
