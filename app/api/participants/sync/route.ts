import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getSheetData, parseParticipantRow } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
    console.log('[SYNC] ===== SYNC REQUEST STARTED =====');
    console.log('[SYNC] Time:', new Date().toISOString());

    try {
        const { sheetId, sheetName, eventId, eventName, syncSubType, syncMealName } = await req.json();
        console.log('[SYNC] Request params:', { sheetId, sheetName, eventId, eventName, syncSubType, syncMealName });
        console.log('[SYNC] Environment check:', {
            FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
            FIREBASE_PRIVATE_KEY_LENGTH: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'MISSING'
        });

        if (!sheetId || !eventId) {
            console.error('[SYNC] Missing required fields');
            return NextResponse.json({ error: 'Sheet ID and Event ID are required' }, { status: 400 });
        }

        // Determine Allowed Meals based on Sync Settings
        let allowedMeals: string[] = [];
        if (syncSubType === 'hostel_day') {
            allowedMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
        } else if (syncSubType === 'other' && syncMealName) {
            allowedMeals = [syncMealName.toLowerCase()];
        } else {
            // Default fallback if nothing specified
            allowedMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
        }
        console.log('[SYNC] Configured Allowed Meals:', allowedMeals);

        // Use Shared Library to fetch data
        console.log('[SYNC] Fetching sheet data...');
        const { headers, dataRows, targetSheetName } = await getSheetData(sheetId, sheetName);
        console.log('[SYNC] ✅ Sheet data fetched:', { rowCount: dataRows.length, headers });

        // Update Event with persistent link automatically on successful sync
        await adminDb.collection('events').doc(eventId).update({
            googleSheetId: sheetId,
            googleSheetName: targetSheetName,
            syncSubType: syncSubType || 'hostel_day',
            syncMealName: syncMealName || ''
        });

        // Fetch existing participants to prevent duplicates (by rollNo only)
        const existingSnapshot = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .get();

        const existingRollNos = new Set<string>();

        existingSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.rollNo) existingRollNos.add(data.rollNo.toUpperCase());
        });

        let count = 0;
        let skippedNoName = 0;
        let skippedDuplicate = 0;
        const totalRows = dataRows.length;
        const batchSize = 450;
        let batch = adminDb.batch();
        let batchCount = 0;

        for (const row of dataRows) {
            const data = parseParticipantRow(row, headers);
            if (!data) {
                skippedNoName++;
                continue;
            }

            const { name, email, rollNo, department, college, year, phone, foodPreference, roomNo } = data;

            // Check for duplicates by rollNo only
            const normalizeRoll = rollNo ? rollNo.toUpperCase() : '';

            if (normalizeRoll && existingRollNos.has(normalizeRoll)) {
                skippedDuplicate++;
                continue;
            }

            // Generate Token
            const token = rollNo || Math.random().toString(36).substring(7).toUpperCase();

            // Create Firestore Doc
            const docRef = adminDb.collection('participants').doc();

            batch.set(docRef, {
                document_id: docRef.id, // Keep for legacy
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

                // MEAL CONFIGURATION
                allowedMeals: allowedMeals,
                tokenUsage: {
                    breakfast: false,
                    lunch: false,
                    snacks: false,
                    dinner: false,
                    icecream: false
                }
            });

            // Add to local set to prevent duplicates within the same sheet sync
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
            count: count,
            totalRows: totalRows,
            skippedNoName: skippedNoName,
            skippedDuplicate: skippedDuplicate
        });

    } catch (error: any) {
        console.error('[SYNC] ===== ERROR OCCURRED =====');
        console.error('[SYNC] Error name:', error.name);
        console.error('[SYNC] Error message:', error.message);
        console.error('[SYNC] Error code:', error.code);
        console.error('[SYNC] Error stack:', error.stack);
        console.error('[SYNC] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        return NextResponse.json({
            error: error.message || 'Failed to sync with Google Sheets. Check permissions and ID.',
            errorType: error.name,
            errorCode: error.code,
            details: error.stack,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
