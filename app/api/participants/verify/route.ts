import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { ticketId } = await req.json();

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
        }

        // Find the participant by ticket_id
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef
            .where('ticket_id', '==', ticketId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

        const participantDoc = snapshot.docs[0];
        const participant = participantDoc.data();

        // Return full participant details
        return NextResponse.json({
            success: true,
            ticketId: participant.ticket_id,
            name: participant.name,
            rollNo: participant.rollNo,
            department: participant.department,
            eventName: participant.event_name,
            college: participant.college,
            status: participant.status,
            foodPreference: participant.foodPreference,
            roomNo: participant.roomNo,
            email: participant.email,
            phone: participant.phone
        });

    } catch (error: any) {
        console.error('Verify API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
