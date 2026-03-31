import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        await connectDB();

        // Fetch participants for this event, sort by latest
        const participants = await Participant.find({ event_id: eventId })
            .sort({ createdAt: -1 })
            .lean();

        // We only really need to show those with formResponses to monitor the native form
        const formRespondents = participants.filter((p: any) => p.formResponses && Object.keys(p.formResponses).length > 0);

        return NextResponse.json({ success: true, participants: formRespondents, total: participants.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
