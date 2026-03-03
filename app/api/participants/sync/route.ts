import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
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

        await connectDB();

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
        await Event.findByIdAndUpdate(eventId, {
            googleSheetId: sheetId,
            googleSheetName: targetSheetName,
            syncSubType: syncSubType || 'hostel_day',
            syncMealName: syncMealName || ''
        });

        // Fetch existing participants to map rollNo -> documentId
        const existingDocs = await Participant.find({ event_id: eventId }).lean() as any[];

        const docIdToDataMap = new Map<string, any>();
        const rollToDocIdMap = new Map<string, string>();
        const emailToDocIdMap = new Map<string, string>();

        existingDocs.forEach(d => {
            const idStr = d._id.toString();
            docIdToDataMap.set(idStr, d);
            if (d.rollNo) {
                rollToDocIdMap.set(d.rollNo.toUpperCase().trim(), idStr);
            }
            if (d.email) {
                emailToDocIdMap.set(d.email.toLowerCase().trim(), idStr);
            }
        });

        let count = 0;
        let updated = 0;
        let skippedNoName = 0;
        let skippedDuplicateInSheet = 0; // within the current sheet run
        const totalRows = dataRows.length;
        const bulkOps: any[] = [];

        const currentRunRolls = new Set<string>();

        for (const row of dataRows) {
            const data = parseParticipantRow(row, headers);
            if (!data || !data.name) {
                skippedNoName++;
                continue;
            }

            const { name, email, rollNo, department, college, year, phone, foodPreference, roomNo } = data;
            const normalizeRoll = rollNo ? rollNo.toUpperCase().trim() : '';
            const normalizeEmail = email ? email.toLowerCase().trim() : '';

            // 1. Skip if duplicate WITHIN THE SAME SHEET RUN
            const dedupeKey = normalizeRoll || normalizeEmail || name.toLowerCase().trim();
            if (dedupeKey && currentRunRolls.has(dedupeKey)) {
                skippedDuplicateInSheet++;
                continue;
            }
            if (dedupeKey) currentRunRolls.add(dedupeKey);

            // 2. Decide: Create OR Update
            let existingId = null;
            if (normalizeRoll && rollToDocIdMap.has(normalizeRoll)) {
                existingId = rollToDocIdMap.get(normalizeRoll);
            } else if (normalizeEmail && emailToDocIdMap.has(normalizeEmail)) {
                existingId = emailToDocIdMap.get(normalizeEmail);
            }

            const existingData = existingId ? docIdToDataMap.get(existingId) : null;

            if (existingId && existingData) {
                // UPDATE EXISTING
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
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: existingData._id },
                            update: {
                                $set: {
                                    name, email, department, year, phone, foodPreference, roomNo,
                                    status: 'generated', // ONLY RESET status if data changed
                                    event_name: eventName,
                                    allowedMeals: newMeals
                                }
                            }
                        }
                    });
                    updated++;
                }
            } else {
                // CREATE NEW
                const token = rollNo || Math.random().toString(36).substring(7).toUpperCase();

                bulkOps.push({
                    insertOne: {
                        document: {
                            name, email, college, event_name: eventName, event_id: eventId,
                            department, year, phone, rollNo, foodPreference, roomNo,
                            token,
                            status: 'generated',
                            ticket_id: 'INV-' + Date.now().toString().slice(-6) + '-' + count,
                            check_in_time: null,
                            allowedMeals: allowedMeals,
                            tokenUsage: {
                                breakfast: false, lunch: false, snacks: false, dinner: false, icecream: false
                            }
                        }
                    }
                });
                count++;
            }
        }

        if (bulkOps.length > 0) {
            await Participant.bulkWrite(bulkOps);
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
