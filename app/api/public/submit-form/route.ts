import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import Student from '@/models/Student';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { eventId, rollNo, answers } = await req.json();

        if (!eventId || !rollNo || !answers) {
            return NextResponse.json({ error: 'Missing required fields: eventId, rollNo, or answers' }, { status: 400 });
        }

        await connectDB();

        const event = await Event.findById(eventId);
        if (!event || !event.isActive) {
            return NextResponse.json({ error: 'Event not active or found' }, { status: 404 });
        }

        const globalStudent = await Student.findOne({ 
            rollNo: new RegExp(`^${rollNo}$`, 'i'),
            adminId: event.adminId
        });
        if (!globalStudent) {
            return NextResponse.json({ error: 'Global student profile not found. Please contact administration.' }, { status: 404 });
        }

        let uploadedPhoto = null;
        if (event.formFields) {
            for (const field of event.formFields) {
                if (field.type === 'file_upload' && answers[field.id]) {
                    uploadedPhoto = answers[field.id];
                }
            }
        }

        // If a photo was submitted and it differs from the global one, update it globally
        if (uploadedPhoto && globalStudent.photo !== uploadedPhoto) {
            globalStudent.photo = uploadedPhoto;
            await globalStudent.save();
        }

        const token = crypto.randomBytes(4).toString('hex').toUpperCase();

        const newParticipant = new Participant({
            event_id: eventId,
            event_name: event.name,
            name: globalStudent.name,
            email: globalStudent.email || '',
            rollNo: globalStudent.rollNo,
            department: globalStudent.department || '',
            year: globalStudent.year || '',
            college: globalStudent.college || '',
            foodPreference: globalStudent.foodPreference || 'Veg',
            token,
            status: 'submitted',
            formResponses: answers
        });

        await newParticipant.save();

        return NextResponse.json({ success: true, message: 'Form submitted successfully', token });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
