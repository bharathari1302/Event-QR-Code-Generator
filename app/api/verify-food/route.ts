import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import EventStat from '@/models/EventStat';
import Participant from '@/models/Participant';
import MessLog from '@/models/MessLog';
import { getParticipantPhotoUrl } from '@/lib/googleDriveHelper';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        let token: string;
        let mealType: string;

        // Extract selectedMeal passed from the frontend Dropdown
        const { qrPayload, dryRun, selectedMeal } = await req.json();

        if (!qrPayload) {
            return NextResponse.json({ valid: false, message: 'Invalid QR Format' }, { status: 400 });
        }

        console.log('[VerifyFood] Received QR Payload:', qrPayload, 'Selected Meal from UI:', selectedMeal);

        // Parse the payload - format can be "ticket_id|meal" or "token|meal"
        const parts = qrPayload.split('|');
        const identifier = parts[0]?.trim();
        // If meal is in QR, use it. Otherwise default to selectedMeal
        let qrMealType = parts[1] ? parts[1].toLowerCase().replace(/\s+/g, '').trim() : null;

        console.log('[VerifyFood] Parsed - Identifier:', identifier, 'QR MealType:', qrMealType);

        await connectDB();

        let data = null;

        data = await Participant.findOne({
            $or: [
                { ticket_id: identifier },
                { token: identifier }
            ]
        }).lean() as any;

        if (!data) {
            console.log('[VerifyFood] No participant found with identifier:', identifier);
            return NextResponse.json({ valid: false, status: 'invalid', message: 'Invalid Token' });
        }

        const activeMeal = selectedMeal ? selectedMeal.toLowerCase().replace(/\s+/g, '').trim() : null;

        // --- NEW LOGIC: Strict Meal Comparison ---
        // If the Scanner has an active meal selected, we must enforce it strictly.
        if (activeMeal) {
            // If the QR code has a meal, it MUST match the selected meal.
            if (qrMealType && qrMealType !== activeMeal) {
                return NextResponse.json({
                    valid: false,
                    status: 'invalid',
                    participant: {
                        name: data.name,
                        ticket_id: data.ticket_id,
                    },
                    message: `Invalid Meal. This is a ${qrMealType.toUpperCase()} QR Code. Currently scanning ${activeMeal.toUpperCase()}.`
                });
            }

            // Definitively use the coordinator's selected meal
            mealType = activeMeal;
        } else if (qrMealType) {
            mealType = qrMealType;
        } else {
            // Fallback: Check if allowedMeals exists and has only one entry
            if (data.allowedMeals && data.allowedMeals.length === 1) {
                mealType = data.allowedMeals[0].toLowerCase();
            } else {
                mealType = 'breakfast';
            }
        }

        // Validate if this resulting meal is actually permitted for this participant
        if (data.allowedMeals && !data.allowedMeals.map((m: string) => m.toLowerCase()).includes(mealType)) {
            return NextResponse.json({
                valid: false,
                status: 'invalid',
                participant: {
                    name: data.name,
                    ticket_id: data.ticket_id,
                },
                message: `Not Valid for ${mealType.toUpperCase()}`
            });
        }

        console.log('[VerifyFood] Found participant:', data.name, 'Final Meal:', mealType);


        // Check for event-specific drive folder
        let driveFolderId: string | undefined;
        let eventType = 'special';
        if (data.event_id) {
            const eventDoc = await Event.findById(data.event_id).lean() as any;
            if (eventDoc) {
                driveFolderId = eventDoc.driveFolderId;
                eventType = eventDoc.eventType || 'special';
            }
        }

        // Force 'Veg' if it's a daily event
        const displayFoodPref = eventType === 'daily' ? 'Veg' : (data.foodPreference || 'Veg');

        // Fetch photo with timeout to avoid long delays
        let driveUrl: string | null = null;
        try {
            const photoFetchPromise = getParticipantPhotoUrl(data.rollNo, data.name, driveFolderId);
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

        const photoUrl = driveUrl ? `/api/photos/proxy?rollNo=${encodeURIComponent(data.rollNo || '')}&name=${encodeURIComponent(data.name || '')}&eventId=${data.event_id || ''}` : null;

        // 2. Check Usage
        let isUsed = false;

        if (eventType === 'daily') {
            const todayStr = new Date().toISOString().split('T')[0];
            const logEntry = await MessLog.findOne({
                event_id: data.event_id,
                rollNo: data.rollNo,
                date: todayStr,
                mealType: mealType
            });
            if (logEntry) isUsed = true;
        } else {
            const tokenUsage = data.tokenUsage || {};
            if (tokenUsage[mealType] === true) isUsed = true;
        }

        if (isUsed) {
            return NextResponse.json({
                valid: false,
                status: 'used',
                participant: {
                    name: data.name,
                    foodPreference: displayFoodPref,
                    roomNo: data.roomNo,
                    rollNo: data.rollNo,
                    college: data.college,
                    ticket_id: data.ticket_id,
                    photoUrl: photoUrl,
                },
                scanDetails: {
                    mealType: mealType
                },
                message: `${mealType.toUpperCase()} Already Redeemed${eventType === 'daily' ? ' Today' : ''}`
            });
        }


        if (dryRun) {
            return NextResponse.json({
                valid: true,
                status: 'eligible', // New status for valid but not yet marked used
                participant: {
                    name: data.name,
                    foodPreference: displayFoodPref,
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
        if (eventType === 'daily') {
            const todayStr = new Date().toISOString().split('T')[0];
            const newLog = new MessLog({
                event_id: data.event_id,
                rollNo: data.rollNo,
                mealType: mealType,
                date: todayStr,
                adminId: data.event_id // Or fetch precise admin ID if available, but event handles isolation
            });
            await newLog.save();
        } else {
            const updateObj: any = {};
            updateObj[`tokenUsage.${mealType}`] = true;
            updateObj[`check_ins.${mealType}`] = new Date();
            await Participant.updateOne({ _id: data._id }, { $set: updateObj });
        }

        // 4. Update Stats (Async)
        // Store flat stats or nested. Our EventStat schema expects `stats: Map of Numbers`
        if (data.event_id) {
            const isVeg = data.foodPreference?.toLowerCase().includes('veg') && !data.foodPreference?.toLowerCase().includes('non');

            const incFields: any = {};
            incFields[`stats.total_${mealType}`] = 1;
            incFields[`stats.${isVeg ? 'veg' : 'nonveg'}_${mealType}`] = 1;

            await EventStat.findOneAndUpdate(
                { eventId: data.event_id },
                {
                    $inc: incFields,
                    $set: { last_updated: new Date() }
                },
                { upsert: true }
            );
        }

        return NextResponse.json({
            valid: true,
            status: 'verified',
            participant: {
                name: data.name,
                foodPreference: displayFoodPref,
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
