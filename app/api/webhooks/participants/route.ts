import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Secret key to secure the webhook (should ideally be in .env)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'hostel_token_system_secret_key';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { secret, eventId, eventName, data } = body;

        // 1. Security Check
        if (secret !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!eventId || !data) {
            return NextResponse.json({ error: 'Missing eventId or data' }, { status: 400 });
        }

        console.log(`[Webhook] Received particpant for Event: ${eventId}`, data);

        // 2. Parse Data (Flexible mapping)
        // Data comes as Key-Value pair from Apps Script
        const name = data['Name'] || data['name'] || data['Student Name'] || data['Participant Name'];
        const email = data['Email Address'] || data['email'] || data['Kongu.edu mail'] || data['E-mail(Kongu ID)'] || '';
        const rollNo = data['Roll No'] || data['rollNo'] || data['Register No'];
        const department = data['Department'] || data['department'];
        const year = data['Year'] || data['year'];
        const phone = data['Phone'] || data['phone'] || data['Mobile'] || data['Mobile Number'];
        const foodPreference = data['Food Preference'] || data['food'] || data['Veg or Non Veg'] || 'Veg';
        const roomNo = data['Room No'] || data['room'] || data['Room NO'];

        if (!name || !rollNo) {
            return NextResponse.json({ error: 'Name and Roll No are required' }, { status: 400 });
        }

        const normalizedRoll = rollNo.toUpperCase().trim();
        const normalizedEmail = email ? email.toLowerCase().trim() : '';

        // 3. Check for Duplicates (Firestore Transaction or simple check)
        // Simple check to keep it fast
        const existingDocs = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .where('rollNo', '==', normalizedRoll)
            .get();

        if (!existingDocs.empty) {
            console.log(`[Webhook] Duplicate participant skipped: ${normalizedRoll}`);
            return NextResponse.json({ message: 'Participant already exists', skipped: true });
        }

        // 4. Create Participant
        // Fetch event defaults if needed (e.g. allowedMeals)
        // For speed, we'll try to fetch event details or fall back to defaults
        let allowedMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream']; // Fallback

        const eventDoc = await adminDb.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
            const eventData = eventDoc.data();
            // If event has specific sync settings, valid logic would be here
            // reusing logic from sync route:
            if (eventData?.syncSubType === 'hostel_day') {
                allowedMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
            } else if (eventData?.syncSubType === 'other' && eventData?.syncMealName) {
                allowedMeals = [eventData.syncMealName.toLowerCase()];
            }
        }

        const token = normalizedRoll;
        const docRef = adminDb.collection('participants').doc();

        const newParticipant = {
            ...data, // Spread ALL sheet columns into the document root as requested
            document_id: docRef.id,
            name: name,
            email: normalizedEmail,
            college: 'Kongu Engineering College', // Default
            event_name: eventName || eventDoc.data()?.name || 'Unknown Event',
            event_id: eventId,
            department: department || '',
            year: year || '',
            phone: phone || '',
            rollNo: normalizedRoll,
            foodPreference: foodPreference,
            roomNo: roomNo || '',
            token: token,
            status: 'generated',
            ticket_id: 'WEB-' + Date.now().toString().slice(-6),
            created_at: new Date(),
            check_in_time: null,
            allowedMeals: allowedMeals,
            tokenUsage: {
                breakfast: false,
                lunch: false,
                snacks: false,
                dinner: false,
                icecream: false
            },
            source: 'webhook'
        };

        await docRef.set(newParticipant);

        console.log(`[Webhook] Added participant: ${name} (${normalizedRoll})`);

        return NextResponse.json({ success: true, id: docRef.id });

    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
