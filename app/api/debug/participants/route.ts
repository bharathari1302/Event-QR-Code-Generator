import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
        return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    try {
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.where('event_id', '==', eventId).get();

        const stats: Record<string, number> = {
            total: snapshot.size,
        };

        const samples: any[] = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const status = data.status || 'unknown';
            stats[status] = (stats[status] || 0) + 1;

            if (samples.length < 10) {
                samples.push({
                    id: doc.id,
                    name: data.name,
                    rollNo: data.rollNo,
                    email: data.email,
                    status: data.status
                });
            }
        });

        return NextResponse.json({
            success: true,
            eventId,
            stats,
            samples
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
