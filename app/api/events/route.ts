import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { name, date, venue, description } = await req.json();

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and Date are required' }, { status: 400 });
        }

        const docRef = adminDb.collection('events').doc();
        await docRef.set({
            id: docRef.id,
            name,
            date, // Store as string or timestamp, string ISO is easiest for simple UI
            venue: venue || '',
            description: description || '',
            created_at: new Date(),
        });

        return NextResponse.json({ success: true, id: docRef.id, message: 'Event Created' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const snapshot = await adminDb.collection('events').orderBy('created_at', 'desc').get();
        const events = snapshot.docs.map(doc => doc.data());

        return NextResponse.json({ success: true, events });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
