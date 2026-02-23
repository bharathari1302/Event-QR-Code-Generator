import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { generateInvitationPDF } from '@/lib/pdfGenerator';
import { sendEmail } from '@/lib/email';

// Force dynamic to prevent caching of the stream
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { pdfPurpose, hostelSubType, customMealName, eventId } = body || {};

    if (!eventId) {
        return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Query participants for THIS event
                const participantsRef = adminDb.collection('participants');
                const snapshot = await participantsRef
                    .where('event_id', '==', eventId)
                    .where('status', '==', 'generated')
                    .limit(450)
                    .get();

                if (snapshot.empty) {
                    controller.enqueue(encoder.encode(JSON.stringify({ message: 'No pending invitations found.', done: true }) + '\n'));
                    controller.close();
                    return;
                }

                // Fetch Event Details for PDF
                const eventDoc = await adminDb.collection('events').doc(eventId).get();
                const eventData = eventDoc.data() || {};
                const realEventName = eventData.name || 'Event';

                const totalDocs = snapshot.size;
                let processedCount = 0;
                let successCount = 0;
                let failCount = 0;

                // Determine PDF settings
                let singleMealName: string | undefined = undefined;

                // Always Hostel/Meal Invitation in this system
                if (hostelSubType === 'other' && customMealName) singleMealName = customMealName;

                const batch = adminDb.batch();
                const docs = snapshot.docs;
                const CHUNK_SIZE = 10;

                // Notify start
                controller.enqueue(encoder.encode(JSON.stringify({ status: 'started', total: totalDocs, processed: 0 }) + '\n'));

                for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
                    const chunk = docs.slice(i, i + CHUNK_SIZE);

                    await Promise.all(chunk.map(async (doc) => {
                        const p = doc.data();
                        try {
                            const pdfBuffer = await generateInvitationPDF({
                                name: p.name,
                                college: p.college,
                                event_name: realEventName, // Use authentic name
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
                                    // Send individual failure reason
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
                        } catch (err) {
                            console.error('Error', err);
                            failCount++;
                        }
                    }));

                    processedCount += chunk.length;

                    // Send progress update
                    const progressData = JSON.stringify({
                        status: 'progress',
                        total: totalDocs,
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
                    done: true
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
