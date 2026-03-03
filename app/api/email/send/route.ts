import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import { generateInvitationPDF } from '@/lib/pdfGenerator';
import { sendEmail } from '@/lib/email';

// Force dynamic to prevent caching of the stream
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for this route function

export async function POST(req: NextRequest) {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { pdfPurpose, hostelSubType, customMealName, eventId, targetRollNo, regenerateToken } = body || {};
    console.log('[EMAIL] Processing request for eventId:', eventId, { hostelSubType, customMealName, targetRollNo, regenerateToken });

    if (!eventId) {
        console.error('[EMAIL] Missing eventId');
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                await connectDB();

                // 1. Query participants for THIS event - BATCHED for stability on Hobby Tier
                let query: any = { event_id: eventId };

                // If specific target applies, filter it. Otherwise, only run bulk for 'generated' status.
                if (targetRollNo) {
                    query.rollNo = targetRollNo.trim().toUpperCase();
                } else {
                    query.status = 'generated';
                }

                // Get absolute current pending count for the progress bar
                const absoluteTotalPending = await Participant.countDocuments(query);

                // Process a tiny batch (5) one-by-one to stay under 10s Hobby limit
                const BATCH_LIMIT = 5;
                const docs = await Participant.find(query).limit(BATCH_LIMIT + 1).lean() as any[];

                console.log(`[EMAIL] Query result for ${eventId}: ${docs.length > BATCH_LIMIT ? BATCH_LIMIT : docs.length}/${absoluteTotalPending} pending found.`);

                if (docs.length === 0) {
                    console.log(`[EMAIL] No pending participants for ${eventId}`);
                    controller.enqueue(encoder.encode(JSON.stringify({
                        message: 'No pending invitations found.',
                        done: true,
                        hasMore: false,
                        absoluteTotal: 0
                    }) + '\n'));
                    controller.close();
                    return;
                }

                // Check for more
                const hasMore = docs.length > BATCH_LIMIT;
                const batchDocs = docs.slice(0, BATCH_LIMIT);
                const batchTotal = batchDocs.length;

                // Fetch Event Details for PDF
                const eventDoc = await Event.findById(eventId).lean() as any;
                const realEventName = eventDoc?.name || 'Event';

                let processedCount = 0;
                let successCount = 0;
                let failCount = 0;

                // Determine PDF settings
                const selectedMeals: string[] = body.selectedMeals || [];

                // If it's the old 'hostel_day' (empty selectedMeals but subType is hostel_day), default to all basic 5 meals
                if (selectedMeals.length === 0 && hostelSubType === 'hostel_day') {
                    selectedMeals.push('Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Ice Cream');
                } else if (selectedMeals.length === 0 && hostelSubType === 'other' && customMealName) {
                    selectedMeals.push(customMealName);
                }

                const bulkOps: any[] = [];

                // Notify start
                console.log(`[EMAIL] Starting batch session: batchSize: ${batchTotal}, absoluteTotal: ${absoluteTotalPending}`);
                controller.enqueue(encoder.encode(JSON.stringify({
                    status: 'started',
                    total: batchTotal,
                    absoluteTotal: absoluteTotalPending,
                    processed: 0,
                    debug: { eventId, eventName: realEventName }
                }) + '\n'));

                // Sequential processing avoids memory/CPU spikes on Hobby tier
                for (let i = 0; i < batchDocs.length; i++) {
                    const p = batchDocs[i];

                    try {
                        console.log(`[EMAIL] Processing ${i + 1}/${batchTotal}: ${p.name}`);
                        let updatedToken = p.token;
                        let updatedTicketId = p.ticket_id;

                        let docUpdates: any = {};

                        if (regenerateToken) {
                            // Generate new uniqueness token
                            const fallbackToken = `MNTK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                            updatedToken = p.rollNo ? `${p.rollNo}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : fallbackToken;

                            // Generate new ticket ID
                            const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
                            updatedTicketId = `QS-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

                            docUpdates.token = updatedToken;
                            docUpdates.ticket_id = updatedTicketId;
                        }

                        const pdfBuffer = await generateInvitationPDF({
                            name: p.name,
                            college: p.college,
                            event_name: realEventName,
                            sub_event_name: p.sub_event_name,
                            ticket_id: updatedTicketId,
                            token: updatedToken,
                            foodPreference: p.foodPreference,
                            roomNo: p.roomNo,
                            rollNo: p.rollNo,
                            eventId: eventId
                        }, { selectedMeals });

                        if (p.email) {
                            let subject = `Your Invitation`;
                            let htmlBody = '';

                            if (selectedMeals.length > 0 && selectedMeals.length < 5) {
                                const mealsList = selectedMeals.join(', ');
                                subject = `Q-Swift | ${mealsList} Invitation`;
                                htmlBody = `<p>Hello <strong>${p.name}</strong>,</p><p>You are invited for <strong>${mealsList}</strong> via <strong>Q-Swift</strong>.</p><p>Please find your coupon attached.</p>`;
                            } else {
                                subject = `Q-Swift | Invitation: ${realEventName}`;
                                htmlBody = `<p>Hello <strong>${p.name}</strong>,</p><p>Here is your coupon sheet for <strong>${realEventName}</strong>.<br/>Generated via Q-Swift.</p>`;
                            }

                            const result = await sendEmail({
                                to: p.email,
                                subject,
                                text: 'Please check the attachment.',
                                html: htmlBody,
                                attachments: [{
                                    filename: `Invitation-${updatedTicketId}.pdf`,
                                    content: pdfBuffer,
                                    contentType: 'application/pdf'
                                }]
                            });

                            if (result.success) {
                                docUpdates.status = 'sent';
                                successCount++;
                            } else {
                                failCount++;
                                controller.enqueue(encoder.encode(JSON.stringify({
                                    status: 'error',
                                    error: `Failed for ${p.name}: ${result.error}`,
                                    participant: p.name
                                }) + '\n'));
                            }
                        } else {
                            failCount++;
                            controller.enqueue(encoder.encode(JSON.stringify({
                                status: 'error',
                                error: `No email found for ${p.name}`
                            }) + '\n'));
                        }

                        if (Object.keys(docUpdates).length > 0) {
                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: p._id },
                                    update: { $set: docUpdates }
                                }
                            });
                        }
                    } catch (err: any) {
                        console.error('Individual Email Error', err);
                        failCount++;
                        controller.enqueue(encoder.encode(JSON.stringify({
                            status: 'error',
                            error: `Critical error for ${p.name}: ${err.message}`
                        }) + '\n'));
                    }

                    processedCount++;

                    // Send progress update after EACH student for smoother UI
                    const progressData = JSON.stringify({
                        status: 'progress',
                        total: batchTotal,
                        absoluteTotal: absoluteTotalPending,
                        processed: processedCount,
                        success: successCount,
                        failed: failCount
                    });
                    controller.enqueue(encoder.encode(progressData + '\n'));
                }

                if (bulkOps.length > 0) {
                    await Participant.bulkWrite(bulkOps);
                }

                // Final message
                controller.enqueue(encoder.encode(JSON.stringify({
                    status: 'completed',
                    message: `Sent ${successCount} emails. Failed: ${failCount}`,
                    success: successCount,
                    failed: failCount,
                    done: true,
                    hasMore: hasMore, // TELL FRONTEND TO LOOP
                    absoluteTotal: absoluteTotalPending // Should ideally be absoluteTotalPending - successCount
                }) + '\n'));

                controller.close();

            } catch (error: any) {
                console.error('Stream Error:', error);
                controller.enqueue(encoder.encode(JSON.stringify({ error: error.message || 'Internal Error' }) + '\n'));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-transform'
        }
    });
}
