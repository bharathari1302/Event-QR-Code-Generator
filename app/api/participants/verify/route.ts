import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { rollNo, eventId, coordinatorDept } = await req.json();

        if (!rollNo || !eventId) {
            return NextResponse.json({ error: 'Roll Number and Event ID are required' }, { status: 400 });
        }

        // Find the participant
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef
            .where('rollNo', '==', rollNo)
            .where('event_id', '==', eventId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Participant not found for this event' }, { status: 404 });
        }

        const participantDoc = snapshot.docs[0];
        const participant = participantDoc.data();

        // Optional: Check if coordinator's department matches participant's department
        // This adds an extra layer of verification
        if (coordinatorDept && participant.department && participant.department !== coordinatorDept) {
            return NextResponse.json({
                error: `Department mismatch. Participant is from ${participant.department}, but you are from ${coordinatorDept}`
            }, { status: 403 });
        }

        // Return participant details
        return NextResponse.json({
            success: true,
            name: participant.name,
            rollNo: participant.rollNo,
            department: participant.department,
            eventName: participant.event_name,
            college: participant.college,
            status: participant.status
        });

    } catch (error: any) {
        console.error('Verify API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
