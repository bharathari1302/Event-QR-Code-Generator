import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const type = searchParams.get('type') || 'live_dashboard'; // 'live_dashboard' or specific

        if (!eventId) {
            // For now, if no eventId, maybe fetch all loops or just return error.
            // Let's try to fetch all active events or just return empty if strictly required.
            // For MVP, if single event, we might hardcode or list them.
            // But let's assume the warden selects an event or we pass it.
            // fallback: return params error
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        const docRef = adminDb.collection('events').doc(eventId).collection('stats').doc(type);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({
                stats: {
                    total_breakfast: 0, veg_breakfast: 0, nonveg_breakfast: 0,
                    total_lunch: 0, veg_lunch: 0, nonveg_lunch: 0,
                    total_snacks: 0, veg_snacks: 0, nonveg_snacks: 0,
                    total_dinner: 0, veg_dinner: 0, nonveg_dinner: 0,
                    total_icecream: 0, veg_icecream: 0, nonveg_icecream: 0,
                }
            });
        }

        return NextResponse.json({ stats: doc.data() });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
