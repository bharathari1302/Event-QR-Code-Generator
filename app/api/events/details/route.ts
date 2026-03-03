import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const adminId = req.headers.get('x-admin-id');

    if (!adminId) {
        return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
    }

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    try {
        await connectDB();
        const event = await Event.findOne({ _id: eventId, adminId }).lean();

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...event,
            id: event._id?.toString(),
            created_at: event.createdAt
        });
    } catch (error: any) {
        console.error('Error fetching event details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
