import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    try {
        const doc = await adminDb.collection('events').doc(eventId).get();
        if (!doc.exists) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const data = doc.data();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching event details:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
