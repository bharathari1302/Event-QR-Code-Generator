import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function POST(req: NextRequest) {
    try {
        const { name, date, venue, description, eventType } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and Date are required' }, { status: 400 });
        }

        await connectDB();

        const newEvent = new Event({
            name,
            date,
            eventType: eventType || 'special',
            venue: venue || '',
            description: description || '',
            adminId
        });

        await newEvent.save();

        return NextResponse.json({ success: true, id: newEvent._id.toString(), message: 'Event Created' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');

        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        await connectDB();

        const query: any = { adminId };
        if (type) {
            query.eventType = type;
        }

        const events = await Event.find(query).sort({ createdAt: -1 }).lean();

        const formattedEvents = events.map((doc: any) => ({
            ...doc,
            id: doc._id.toString(),
            created_at: doc.createdAt ? new Date(doc.createdAt).toISOString() : null
        }));

        return NextResponse.json({ success: true, events: formattedEvents });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
