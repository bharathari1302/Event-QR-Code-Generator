import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getPhotoUrlByRollNo } from '@/lib/googleDriveHelper';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { qrPayload, dryRun } = await req.json();

        if (!qrPayload) {
            return NextResponse.json({ valid: false, message: 'Invalid QR Format' }, { status: 400 });
        }

        console.log('[VerifyFood] Received QR Payload:', qrPayload);

        let token: string;
        let mealType: string;
        let participantDoc: any = null;

        // Parse the payload - format can be "ticket_id|meal" or "token|meal"
        const parts = qrPayload.split('|');
        const identifier = parts[0];
        mealType = parts[1] ? parts[1].toLowerCase() : 'breakfast';

        console.log('[VerifyFood] Parsed - Identifier:', identifier, 'MealType:', mealType);

        // Determine if identifier is a ticket_id (starts with INV-) or a token
        const participantsRef = adminDb.collection('participants');
        let snapshot;

        if (identifier.startsWith('INV-')) {
            // New format: ticket_id
            console.log('[VerifyFood] Looking up by ticket_id:', identifier);
            snapshot = await participantsRef.where('ticket_id', '==', identifier).limit(1).get();

            if (snapshot.empty) {
                console.log('[VerifyFood] No participant found with ticket_id:', identifier);
                return NextResponse.json({ valid: false, status: 'invalid', message: 'Invalid Ticket ID' });
            }
        } else {
            // Old format: token
            console.log('[VerifyFood] Looking up by token:', identifier);
            snapshot = await participantsRef.where('token', '==', identifier).limit(1).get();

            if (snapshot.empty) {
                console.log('[VerifyFood] No participant found with token:', identifier);
                return NextResponse.json({ valid: false, status: 'invalid', message: 'Invalid Token' });
            }
        }

        participantDoc = snapshot.docs[0];
        const data = participantDoc.data();
        const docRef = participantDoc.ref;

        console.log('[VerifyFood] Found participant:', data.name, 'Meal:', mealType);


        // Fetch photo URL from Google Drive based on roll number
        // Check for event-specific drive folder
        let driveFolderId: string | undefined;
        if (data.event_id) {
            const eventDoc = await adminDb.collection('events').doc(data.event_id).get();
            if (eventDoc.exists) {
                driveFolderId = eventDoc.data()?.driveFolderId;
            }
        }

        // Fetch photo with timeout to avoid long delays
        let driveUrl: string | null = null;
        try {
            const photoFetchPromise = getPhotoUrlByRollNo(data.rollNo, driveFolderId);
            const timeoutPromise = new Promise<null>((resolve) =>
                setTimeout(() => resolve(null), 1500) // 1.5 second timeout
            );

            driveUrl = await Promise.race([photoFetchPromise, timeoutPromise]);

            if (!driveUrl) {
                console.log('[VerifyFood] Photo fetch timed out or not found');
            }
        } catch (error) {
            console.error('[VerifyFood] Photo fetch error:', error);
            driveUrl = null;
        }

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
