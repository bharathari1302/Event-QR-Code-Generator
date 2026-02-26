import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('eventId');
    const rollNo = url.searchParams.get('rollNo')?.trim().toUpperCase();

    if (!eventId || !rollNo) {
        return NextResponse.json({ error: 'Event ID and Roll No are required' }, { status: 400 });
    }

    try {
        const snapshot = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .where('rollNo', '==', rollNo)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Participant not found in this event' }, { status: 404 });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        return NextResponse.json({
            id: doc.id,
            name: data.name,
            rollNo: data.rollNo,
            email: data.email,
            department: data.department,
            status: data.status
        });

    } catch (error: any) {
        console.error('Search Participant Error:', error);
        return NextResponse.json({ error: 'Failed to search participant' }, { status: 500 });
    }
}
