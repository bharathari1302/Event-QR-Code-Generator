import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function POST(req: NextRequest) {
    try {
        const { ticketId } = await req.json();

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
        }

        await connectDB();

        // Find the participant by ticket_id
        const participant = await Participant.findOne({ ticket_id: ticketId }).lean();

        if (!participant) {
            return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
        }

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
