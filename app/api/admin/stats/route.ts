import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        // Get all events owned by this admin to filter participants
        const adminEvents = await Event.find({ adminId }).select('_id').lean();
        const eventIds = adminEvents.map(e => e._id.toString());

        // Run aggregation queries in parallel, scoped to adminId where applicable
        const [totalEvents, totalParticipants, totalUsers] = await Promise.all([
            Event.countDocuments({ adminId }),
            Participant.countDocuments({ event_id: { $in: eventIds } }),
            User.countDocuments({ adminId })
        ]);

        return NextResponse.json({
            totalEvents,
            totalParticipants,
            totalUsers
        });

    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
