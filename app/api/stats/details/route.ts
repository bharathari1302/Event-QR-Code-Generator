import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const meal = searchParams.get('meal'); // breakfast, lunch, etc.

        if (!eventId || !meal) {
            return NextResponse.json({ error: 'Event ID and Meal Type required' }, { status: 400 });
        }

        const participantsRef = adminDb.collection('participants');

        console.log(`FETCHING DETAILS: eventId=${eventId}, meal=${meal}`);

        // Query ALL participants for the event (removed meal filter)
        const snapshot = await participantsRef
            .where('event_id', '==', eventId)
            .get();

        console.log(`FETCH DETAILS: Found ${snapshot.size} participants for event ${eventId}`);

        const participants = snapshot.docs.map(doc => {
            const data = doc.data();
            const isServed = data.tokenUsage?.[meal] === true;

            return {
                id: doc.id,
                name: data.name,
                rollNo: data.rollNo || 'N/A',
                roomNo: data.roomNo || 'N/A',
                foodPreference: data.foodPreference || 'Not Specified',
                status: isServed ? 'Served' : 'Pending',
                // Try to get specific check-in time if served
                timestamp: isServed
                    ? (data[`check_in_${meal}`]?.toDate().toLocaleString() || 'Verified')
                    : '-'
            };
        });

        console.log(`FETCH DETAILS: Mapped ${participants.length} participants.`);

        // Sort: Served first, then by name
        participants.sort((a, b) => {
            if (a.status === b.status) {
                return a.name.localeCompare(b.name);
            }
            return a.status === 'Served' ? -1 : 1;
        });

        return NextResponse.json({ participants });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
