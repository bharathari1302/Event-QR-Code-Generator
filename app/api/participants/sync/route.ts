import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getSheetData, parseParticipantRow } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
    try {
        const { sheetId, sheetName, eventId, eventName } = await req.json();

        if (!sheetId || !eventId) {
            return NextResponse.json({ error: 'Sheet ID and Event ID are required' }, { status: 400 });
        }

        // Use Shared Library to fetch data
        const { headers, dataRows, targetSheetName } = await getSheetData(sheetId, sheetName);

        // Update Event with persistent link automatically on successful sync
        await adminDb.collection('events').doc(eventId).update({
            googleSheetId: sheetId,
            googleSheetName: targetSheetName
        });

        // Fetch existing participants to prevent duplicates
        const existingSnapshot = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .get();

        const existingEmails = new Set<string>();
        const existingRollNos = new Set<string>();

        existingSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.email) existingEmails.add(data.email.toLowerCase());
            if (data.rollNo) existingRollNos.add(data.rollNo.toUpperCase());
        });

        let count = 0;
        const batchSize = 450;
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const row of dataRows) {
            const data = parseParticipantRow(row, headers);
            if (!data) continue;

            const { name, email, rollNo, department, college, year, phone, foodPreference, roomNo } = data;

            // Check for duplicates
            const normalizeEmail = email ? email.toLowerCase() : '';
            const normalizeRoll = rollNo ? rollNo.toUpperCase() : '';

            const existsByEmail = normalizeEmail && existingEmails.has(normalizeEmail);
            const existsByRoll = normalizeRoll && existingRollNos.has(normalizeRoll);

            if (existsByEmail || existsByRoll) {
                // Skip existing
                continue;
            }

            // Generate Token
            const token = rollNo || Math.random().toString(36).substring(7).toUpperCase();

            // Create Firestore Doc
            const docRef = adminDb.collection('participants').doc();

            batch.set(docRef, {
                document_id: docRef.id,
                name: name,
                email: email,
                college: college,
                event_name: eventName,
                event_id: eventId,
                department: department,
                year: year,
                phone: phone,
                rollNo: rollNo,

                // Fields for specific event types
                foodPreference: foodPreference,
                roomNo: roomNo,

                token: token,
                status: 'generated',
                ticket_id: 'INV-' + Date.now().toString().slice(-6) + '-' + count,
                created_at: new Date(),
                check_in_time: null,
                tokenUsage: {
                    breakfast: false,
                    lunch: false,
                    snacks: false,
                    dinner: false,
                    icecream: false
                }
            });

            // Add to local sets to prevent duplicates within the same sheet sync
            if (normalizeEmail) existingEmails.add(normalizeEmail);
            if (normalizeRoll) existingRollNos.add(normalizeRoll);

            count++;
            batchCount++;

            if (batchCount >= batchSize) {
                await batch.commit();
                batch = adminDb.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synced ${count} participants from Google Sheet.`,
            count: count
        });

    } catch (error: any) {
        console.error('Sheet Sync Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync with Google Sheets. Check permissions and ID.'
        }, { status: 500 });
    }
}
