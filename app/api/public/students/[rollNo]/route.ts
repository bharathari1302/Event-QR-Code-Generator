import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';
import Event from '@/models/Event';

export async function GET(req: NextRequest, { params }: { params: Promise<{ rollNo: string }> }) {
    try {
        const { rollNo } = await params;
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!rollNo || !eventId) {
            return NextResponse.json({ error: 'Roll No and Event ID are required' }, { status: 400 });
        }

        await connectDB();

        const event = await Event.findById(eventId);
        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }
        
        // Find the student globally for this specific admin tenant
        const student = await Student.findOne({ 
            rollNo: new RegExp(`^${rollNo}$`, 'i'),
            adminId: event.adminId 
        }).lean();

        if (!student) {
            return NextResponse.json({ error: 'Student not found in global directory' }, { status: 404 });
        }

        // Return only the fields necessary for the form to prefill / verify
        return NextResponse.json({ 
            success: true, 
            student: {
                name: student.name,
                email: student.email || '',
                photo: student.photo || null,
                customFields: student.customFields || {}
            } 
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
