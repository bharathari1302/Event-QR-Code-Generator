import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, eventName, name, rollNo, email, department, college, year, phone, roomNo, foodPreference, subEventName } = body;

        if (!eventId || !name || !email) {
            return NextResponse.json({ error: 'Event ID, Name, and Email are strictly required.' }, { status: 400 });
        }

        await connectDB();

        let existingDoc = null;

        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        const normalizedRollNo = rollNo ? rollNo.trim().toUpperCase() : '';
        const normalizedName = name.trim();

        // Deduplication Check by Roll No (if provided)
        if (normalizedRollNo) {
            existingDoc = await Participant.findOne({
                event_id: eventId,
                rollNo: normalizedRollNo
            });
        }

        // Secondary Deduplication Check by Email
        if (!existingDoc && normalizedEmail) {
            existingDoc = await Participant.findOne({
                event_id: eventId,
                email: normalizedEmail
            });
        }

        if (existingDoc) {
            // Update existing record
            const updatePayload = {
                name: normalizedName,
                email: normalizedEmail,
                rollNo: normalizedRollNo || existingDoc.rollNo,
                department: department || existingDoc.department || '',
                college: college || existingDoc.college || '',
                year: year || existingDoc.year || '',
                phone: phone || existingDoc.phone || '',
                roomNo: roomNo || existingDoc.roomNo || '',
                foodPreference: foodPreference || existingDoc.foodPreference || 'Veg',
                sub_event_name: subEventName || existingDoc.sub_event_name || ''
            };

            await Participant.findByIdAndUpdate(existingDoc._id, updatePayload);
            return NextResponse.json({ success: true, message: 'Participant updated successfully', type: 'updated' });
        } else {
            // Create new record
            const fallbackToken = `MNTK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const token = normalizedRollNo || fallbackToken;

            // Generate ticket ID
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const ticket_id = `QS-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            const newParticipant = new Participant({
                event_id: eventId,
                event_name: eventName || 'Event',
                sub_event_name: subEventName || '',
                name: normalizedName,
                email: normalizedEmail,
                rollNo: normalizedRollNo,
                department: department || '',
                college: college || '',
                year: year || '',
                phone: phone || '',
                foodPreference: foodPreference || 'Veg',
                roomNo: roomNo || '',
                status: 'generated',
                ticket_id,
                token
            });

            await newParticipant.save();
            return NextResponse.json({ success: true, message: 'Participant added successfully', type: 'added' });
        }

    } catch (error: any) {
        console.error('Add/Update Participant Error:', error);
        return NextResponse.json({ error: 'Failed to process participant: ' + error.message }, { status: 500 });
    }
}
