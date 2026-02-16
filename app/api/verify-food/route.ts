import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getPhotoUrlByRollNo } from '@/lib/googleDriveHelper';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { qrPayload, dryRun } = await req.json();

        if (!qrPayload || !qrPayload.includes('|')) {
            return NextResponse.json({ valid: false, message: 'Invalid QR Format' }, { status: 400 });
        }

        const [token, mealTypeRaw] = qrPayload.split('|');
        const mealType = mealTypeRaw.toLowerCase();

        // 1. Query Participant
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.where('token', '==', token).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json({ valid: false, status: 'invalid', message: 'Invalid Token' });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const docRef = doc.ref;

        // Fetch photo URL from Google Drive based on roll number
        // Check for event-specific drive folder
        let driveFolderId: string | undefined;
        if (data.event_id) {
            const eventDoc = await adminDb.collection('events').doc(data.event_id).get();
            if (eventDoc.exists) {
                driveFolderId = eventDoc.data()?.driveFolderId;
            }
        }

        const driveUrl = await getPhotoUrlByRollNo(data.rollNo, driveFolderId);

        try {
            const logMsg = `[VerifyFood] ${new Date().toISOString()} - RollNo: ${data.rollNo}, EventID: ${data.event_id}, FolderID: ${driveFolderId}, DriveURL: ${driveUrl ? 'Found' : 'Not Found'}\n`;
            fs.appendFileSync(path.join(process.cwd(), 'debug-photo.log'), logMsg);
        } catch (e) { console.error('Log error', e); }

        console.log(`[VerifyFood] RollNo: ${data.rollNo}, EventID: ${data.event_id}, FolderID: ${driveFolderId}, DriveURL: ${driveUrl ? 'Found' : 'Not Found'}`);
        const photoUrl = driveUrl ? `/api/photos/proxy?rollNo=${data.rollNo}&eventId=${data.event_id || ''}` : null;

        // 2. Check Usage
        // Ensure tokenUsage object exists
        const tokenUsage = data.tokenUsage || {};

        if (tokenUsage[mealType] === true) {
            return NextResponse.json({
                valid: false,
                status: 'used',
                participant: {
                    name: data.name,
                    foodPreference: data.foodPreference,
                    roomNo: data.roomNo,
                    rollNo: data.rollNo,
                    college: data.college,
                    ticket_id: data.ticket_id,
                    photoUrl: photoUrl,
                },
                scanDetails: {
                    mealType: mealType
                },
                message: `${mealType.toUpperCase()} Already Redeemed`
            });
        }

        // 3. Mark as Used Check (Dry Run vs Actual)
        // 3. Mark as Used Check (Dry Run vs Actual)
        // const { dryRun } = await req.json().catch(() => ({})); // REMOVED: Cannot read stream twice


        if (dryRun) {
            return NextResponse.json({
                valid: true,
                status: 'eligible', // New status for valid but not yet marked used
                participant: {
                    name: data.name,
                    foodPreference: data.foodPreference || 'Not Specified',
                    roomNo: data.roomNo,
                    rollNo: data.rollNo,
                    college: data.college,
                    ticket_id: data.ticket_id,
                    photoUrl: photoUrl,
                },
                scanDetails: {
                    mealType: mealType
                },
                message: 'Verification Successful - Approval Required'
            });
        }

        // 4. Mark as Used (Only if NOT dryRun)
        const updateKey = `tokenUsage.${mealType}`;
        await docRef.update({
            [updateKey]: true,
            [`check_in_${mealType}`]: new Date() // Optional timestamp log
        });

        // 4. Update Stats (Async - fire and forget or await)
        // Structure: events/{eventId}/stats/{date_meal} -> { total: X, veg: Y, nonVeg: Z }
        // or simpler: events/{eventId}/live_stats/dashboard
        if (data.event_id) {
            const statsRef = adminDb
                .collection('events')
                .doc(data.event_id)
                .collection('stats')
                .doc('live_dashboard');

            const isVeg = data.foodPreference?.toLowerCase().includes('veg') && !data.foodPreference?.toLowerCase().includes('non');

            // Increment counters
            const batch = adminDb.batch();
            batch.set(statsRef, {
                [`total_${mealType}`]: FieldValue.increment(1),
                [`${isVeg ? 'veg' : 'nonveg'}_${mealType}`]: FieldValue.increment(1),
                last_updated: new Date()
            }, { merge: true });

            await batch.commit();
        }

        return NextResponse.json({
            valid: true,
            status: 'verified',
            participant: {
                name: data.name,
                foodPreference: data.foodPreference || 'Not Specified',
                roomNo: data.roomNo,
                rollNo: data.rollNo,
                college: data.college,
                ticket_id: data.ticket_id,
                photoUrl: photoUrl,
            },
            scanDetails: {
                mealType: mealType
            },
            message: 'Verified'
        });

    } catch (error: any) {
        console.error('Food Verification Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
