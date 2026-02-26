import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { eventId, eventName, name, rollNo, email, department, college, year, phone, roomNo, foodPreference, subEventName } = body;

        if (!eventId || !name || !email) {
            return NextResponse.json({ error: 'Event ID, Name, and Email are strictly required.' }, { status: 400 });
        }

        const participantsRef = adminDb.collection('participants');

        let existingDocId = null;
        let existingData = null;

        // Deduplication Check by Roll No (if provided) or strictly Email
        if (rollNo && rollNo.trim() !== '') {
            const rollQ = await participantsRef
                .where('event_id', '==', eventId)
                .where('rollNo', '==', rollNo.trim().toUpperCase())
                .limit(1)
                .get();

            if (!rollQ.empty) {
                existingDocId = rollQ.docs[0].id;
                existingData = rollQ.docs[0].data();
            }
        }

        // Secondary Deduplication Check by Email
        if (!existingDocId && email && email.trim() !== '') {
            const emailQ = await participantsRef
                .where('event_id', '==', eventId)
                .where('email', '==', email.trim().toLowerCase())
                .limit(1)
                .get();

            if (!emailQ.empty) {
                existingDocId = emailQ.docs[0].id;
                existingData = emailQ.docs[0].data();
            }
        }

        const normalizedEmail = email ? email.trim().toLowerCase() : '';
        const normalizedRollNo = rollNo ? rollNo.trim().toUpperCase() : '';
        const normalizedName = name.trim();

        if (existingDocId) {
            // Update existing record
            const updatePayload = {
                name: normalizedName,
                email: normalizedEmail,
                rollNo: normalizedRollNo || existingData?.rollNo,
                department: department || existingData?.department || '',
                college: college || existingData?.college || '',
                year: year || existingData?.year || '',
                phone: phone || existingData?.phone || '',
                roomNo: roomNo || existingData?.roomNo || '',
                foodPreference: foodPreference || existingData?.foodPreference || 'Veg',
                sub_event_name: subEventName || existingData?.sub_event_name || '',
                updatedAt: new Date().toISOString()
            };

            await participantsRef.doc(existingDocId).update(updatePayload);
            return NextResponse.json({ success: true, message: 'Participant updated successfully', type: 'updated' });
        } else {
            // Create new record
            // Add a simple uniqueness token
            const fallbackToken = `MNTK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const token = normalizedRollNo || fallbackToken;

            // Generate ticket ID
            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
            const ticket_id = `QS-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            const newPayload = {
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
                token,
                createdAt: new Date().toISOString()
            };

            await participantsRef.add(newPayload);
            return NextResponse.json({ success: true, message: 'Participant added successfully', type: 'added' });
        }

    } catch (error: any) {
        console.error('Add/Update Participant Error:', error);
        return NextResponse.json({ error: 'Failed to process participant: ' + error.message }, { status: 500 });
    }
}
