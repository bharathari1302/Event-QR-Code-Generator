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

        // Fetch existing participants to map rollNo -> documentId
        const existingSnapshot = await adminDb.collection('participants')
            .where('event_id', '==', eventId)
            .get();

        const rollToDocMap = new Map<string, string>();
        const rollToDataMap = new Map<string, any>();

        existingSnapshot.forEach(doc => {
            const d = doc.data();
            if (d.rollNo) {
                const norm = d.rollNo.toUpperCase();
                rollToDocMap.set(norm, doc.id);
                rollToDataMap.set(norm, d);
            }
        });

        let count = 0;
        let updated = 0;
        let skippedNoName = 0;
        let skippedDuplicateInSheet = 0; // within the current sheet run
        const totalRows = dataRows.length;
        const batchSize = 450;
        let batch = adminDb.batch();
        let batchCount = 0;

        const currentRunRolls = new Set<string>();

        for (const row of dataRows) {
            const data = parseParticipantRow(row, headers);
            if (!data || !data.name) {
                skippedNoName++;
                continue;
            }

            const { name, email, rollNo, department, college, year, phone, foodPreference, roomNo } = data;
            const normalizeRoll = rollNo ? rollNo.toUpperCase() : '';

            // 1. Skip if duplicate WITHIN THE SAME SHEET RUN
            if (normalizeRoll && currentRunRolls.has(normalizeRoll)) {
                skippedDuplicateInSheet++;
                continue;
            }
            if (normalizeRoll) currentRunRolls.add(normalizeRoll);

            // 2. Decide: Create OR Update
            const existingId = normalizeRoll ? rollToDocMap.get(normalizeRoll) : null;
            const existingData = normalizeRoll ? rollToDataMap.get(normalizeRoll) : null;

            if (existingId && existingData) {
                // UPDATE EXISTING
                const docRef = adminDb.collection('participants').doc(existingId);

                // Merge meals
                const newMeals = [...new Set([...(existingData.allowedMeals || []), ...allowedMeals])];

                // Check if anything significant changed
                const nameChanged = name !== existingData.name;
                const emailChanged = email !== existingData.email;
                const mealsChanged = newMeals.length !== (existingData.allowedMeals?.length || 0);
                const rollChanged = normalizeRoll !== (existingData.rollNo?.toUpperCase() || '');
                const deptChanged = department !== existingData.department;
                // Add more if needed (food pref, etc.)

                if (nameChanged || emailChanged || mealsChanged || rollChanged || deptChanged) {
                    batch.update(docRef, {
                        name, email, department, year, phone, foodPreference, roomNo,
                        status: 'generated', // ONLY RESET status if data changed
                        event_name: eventName,
                        allowedMeals: newMeals,
                        updated_at: new Date()
                    });
                    updated++;
                }
            } else {
                // CREATE NEW
                const docRef = adminDb.collection('participants').doc();
                const token = rollNo || Math.random().toString(36).substring(7).toUpperCase();

                batch.set(docRef, {
                    document_id: docRef.id,
                    name, email, college, event_name: eventName, event_id: eventId,
                    department, year, phone, rollNo, foodPreference, roomNo,
                    token,
                    status: 'generated',
                    ticket_id: 'INV-' + Date.now().toString().slice(-6) + '-' + count,
                    created_at: new Date(),
                    check_in_time: null,
                    allowedMeals: allowedMeals,
                    tokenUsage: {
                        breakfast: false, lunch: false, snacks: false, dinner: false, icecream: false
                    }
                });
                count++;
            }

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
            message: `Processed ${count + updated} participants (${count} new, ${updated} updated).`,
            count: count + updated,
            newCount: count,
            updatedCount: updated,
            totalRows: totalRows,
            skippedNoName: skippedNoName,
            skippedDuplicate: skippedDuplicateInSheet
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
