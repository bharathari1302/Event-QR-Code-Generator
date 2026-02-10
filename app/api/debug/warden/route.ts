import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId') || 'dOTVYiRHgfVBICczaRrz';

        // 1. List top-level collections
        const collections = await adminDb.listCollections();
        const collectionNames = collections.map(c => c.id);

        // 2. Query participants with event_id
        const snap1 = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .limit(3)
            .get();

        // 3. Get ANY participants (no filter)
        const snap2 = await adminDb.collection('participants')
            .limit(5)
            .get();

        const sampleDocs = snap2.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                event_id: d.event_id,
                name: d.name,
                keys: Object.keys(d).sort(),
            };
        });

        // 4. Check events collection
        const eventsSnap = await adminDb.collection('events').limit(3).get();
        const sampleEvents = eventsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
        }));

        // 5. Check if participants are inside events sub-collection
        let subCollParticipants: any[] = [];
        if (eventId) {
            try {
                const subSnap = await adminDb.collection('events').doc(eventId)
                    .collection('participants').limit(3).get();
                subCollParticipants = subSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    event_id: doc.data().event_id,
                }));
            } catch (e) {
                // ignore
            }
        }

        return NextResponse.json({
            topLevelCollections: collectionNames,
            queryEventId: eventId,
            matchCount_event_id: snap1.size,
            totalParticipantsDocs: snap2.size,
            sampleDocs,
            sampleEvents,
            subCollParticipantsCount: subCollParticipants.length,
            subCollParticipants,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
