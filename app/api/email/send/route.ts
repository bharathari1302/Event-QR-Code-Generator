import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
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

    const { pdfPurpose, hostelSubType, customMealName, eventId, targetRollNo } = body || {};
    console.log('[EMAIL] Processing request for eventId:', eventId, { hostelSubType, customMealName, targetRollNo });

    if (!eventId) {
        console.error('[EMAIL] Missing eventId');
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Query participants for THIS event - BATCHED for stability on Hobby Tier
                const participantsRef = adminDb.collection('participants');
                let baseQuery = participantsRef
                    .where('event_id', '==', eventId)
                    .where('status', '==', 'generated');

                // If specific target applies, filter it.
                if (targetRollNo) {
                    baseQuery = baseQuery.where('rollNo', '==', targetRollNo.trim().toUpperCase());
                }

                // Get absolute current pending count for the progress bar
                const totalSnapshot = await baseQuery.count().get();
                const absoluteTotalPending = totalSnapshot.data().count;

                // Process a tiny batch (5) one-by-one to stay under 10s Hobby limit
                const BATCH_LIMIT = 5;
                const snapshot = await baseQuery.limit(BATCH_LIMIT + 1).get();

                console.log(`[EMAIL] Query result for ${eventId}: ${snapshot.size}/${absoluteTotalPending} pending found.`);

                if (snapshot.empty) {
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
                const hasMore = snapshot.size > BATCH_LIMIT;
                const docs = snapshot.docs.slice(0, BATCH_LIMIT);
                const batchTotal = docs.length;

                // Fetch Event Details for PDF
                const eventDoc = await adminDb.collection('events').doc(eventId).get();
                const eventData = eventDoc.data() || {};
                const realEventName = eventData.name || 'Event';

                let processedCount = 0;
                let successCount = 0;
                let failCount = 0;

                // Determine PDF settings
                let singleMealName: string | undefined = undefined;

                // Always Hostel/Meal Invitation in this system
                if (hostelSubType === 'other' && customMealName) singleMealName = customMealName;

                const batch = adminDb.batch();
                const CHUNK_SIZE = 5; // Smaller chunks within the 50-batch for stability

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
                for (let i = 0; i < docs.length; i++) {
                    const doc = docs[i];
                    const p = doc.data();

                    try {
                        console.log(`[EMAIL] Processing ${i + 1}/${batchTotal}: ${p.name}`);
                        const pdfBuffer = await generateInvitationPDF({
                            name: p.name,
                            college: p.college,
                            event_name: realEventName,
                            sub_event_name: p.sub_event_name,
                            ticket_id: p.ticket_id,
                            token: p.token,
                            foodPreference: p.foodPreference,
                            roomNo: p.roomNo,
                            rollNo: p.rollNo,
                            eventId: eventId
                        }, { singleMealName });

                        if (p.email) {
                            let subject = `Your Invitation`;
                            let htmlBody = '';

                            if (singleMealName) {
                                subject = `Q-Swift | ${customMealName || 'Meal'} Invitation`;
                                htmlBody = `<p>Hello <strong>${p.name}</strong>,</p><p>You are invited for <strong>${customMealName}</strong> via <strong>Q-Swift</strong>.</p><p>Please find your coupon attached.</p>`;
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
                                    filename: `Invitation-${p.ticket_id}.pdf`,
                                    content: pdfBuffer,
                                    contentType: 'application/pdf'
                                }]
                            });

                            if (result.success) {
                                batch.update(doc.ref, { status: 'sent' });
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

                await batch.commit();

                // Final message
                controller.enqueue(encoder.encode(JSON.stringify({
                    status: 'completed',
                    message: `Sent ${successCount} emails. Failed: ${failCount}`,
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
