import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { generateInvitationPDF } from '@/lib/pdfGenerator';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json(); // Changed to expect JSON body
        // Note: The UI currently calls this endpoint without body in some earlier versions,
        // but for this feature we will expect a JSON body with options.
        // We need to handle case where body is missing or empty if we want backward compat,
        // or ensure the UI always sends it.
        const { pdfPurpose, hostelSubType, customMealName, venue, eventDate } = body || {};

        // 1. Query participants with status 'generated'
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.where('status', '==', 'generated').limit(50).get();
        // Limit to 50 to avoid timeout on Vercel free tier (10s limit). 
        // Use a loop or queue for production, but manual "click again" works for MVP.

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No pending invitations found.' });
        }

        let successCount = 0;
        let failCount = 0;
        const results = [];

        // Determine PDF Type
        let singleMealName: string | undefined = undefined;
        let isEventInvitation = false;

        if (pdfPurpose === 'hostel') {
            if (hostelSubType === 'other' && customMealName) {
                singleMealName = customMealName;
            }
            // else: Hostel Day (standard 5 meals) - Default
        } else {
            // Event Purpose
            // If venue/date are provided, we treat it as the new "Event Invitation" format
            if (venue && eventDate) {
                isEventInvitation = true;
            }
        }

        // 2. Process each
        const batch = adminDb.batch();

        for (const doc of snapshot.docs) {
            const p = doc.data();

            try {
                // Generate PDF
                const pdfBuffer = await generateInvitationPDF({
                    name: p.name,
                    college: p.college,
                    event_name: p.event_name,
                    sub_event_name: p.sub_event_name,
                    ticket_id: p.ticket_id,
                    token: p.token,
                    // Pass new fields
                    foodPreference: p.foodPreference,
                    roomNo: p.roomNo,
                    rollNo: p.rollNo
                }, {
                    singleMealName: singleMealName,
                    venue: venue,
                    eventDate: eventDate
                });

                // Send Email
                if (p.email) {
                    let subject = `Your Invitation: ${p.event_name || 'Event'}`;
                    let textBody = '';
                    let htmlBody = '';

                    if (singleMealName) {
                        // Case: Special Meal
                        subject = `${customMealName || 'Meal'} Invitation`;
                        textBody = `Hello ${p.name},\n\nYou are invited for ${customMealName}.\n\nStudent Name: ${p.name}\n\nPlease check the attached Coupon for your QR Code.\n\nTicket ID: ${p.ticket_id}`;
                        htmlBody = `<p>Hello <strong>${p.name}</strong>,</p>
                            <p>You are invited for <strong>${customMealName}</strong>.</p>
                            <p><strong>Student Name:</strong> ${p.name}</p>
                            ${p.roomNo ? `<p><strong>Room No:</strong> ${p.roomNo}</p>` : ''}
                            <p>Please find your coupon attached.</p>
                            <br/>
                            <p>Regards,<br/>Hostel Team</p>`;
                    } else if (isEventInvitation) {
                        // Case: Event Invitation (New)
                        subject = `Invitation: ${p.event_name}`;
                        textBody = `Hello ${p.name},\n\nYou are cordially invited to ${p.event_name}.\n\nDate: ${eventDate}\nVenue: ${venue}\n\nPlease find your official invitation attached. Present the QR code at the venue.\n\nTicket ID: ${p.ticket_id}`;
                        htmlBody = `<p>Hello <strong>${p.name}</strong>,</p>
                            <p>You are cordially invited to participate in <strong>${p.event_name}</strong>.</p>
                            <p><strong>Sub-Event:</strong> ${p.sub_event_name || 'General'}</p>
                            <p><strong>Date:</strong> ${eventDate}</p>
                            <p><strong>Venue:</strong> ${venue}</p>
                            <br/>
                            <p>Please find your official <strong>Invitation Card</strong> attached.</p>
                            <p>Present the QR code at the venue for entry/attendance.</p>
                            <br/>
                            <p>Regards,<br/>Event Team</p>`;
                    } else {
                        // Case: Standard / Hostel Day (5 Meals)
                        textBody = `Hello ${p.name},\n\nYou are invited to ${p.event_name || 'the event'}.\n\nStudent Name: ${p.name}\nFood Preference: ${p.foodPreference || 'Not Specified'}\n\nPlease check the attached Coupon Sheet for your QR Code.\n\nTicket ID: ${p.ticket_id}`;
                        htmlBody = `<p>Hello <strong>${p.name}</strong>,</p>
                             <p>You are successfully registered for <strong>${p.event_name}</strong>.</p>
                             <p><strong>Student Name:</strong> ${p.name}</p>
                             <p><strong>Food Preference:</strong> ${p.foodPreference || 'Not Specified'}</p>
                             ${p.roomNo ? `<p><strong>Room No:</strong> ${p.roomNo}</p>` : ''}
                             <p>Please find your official <strong>Coupon Sheet</strong> attached. Present the specific QR code at the food counter.</p>
                             <br/>
                             <p>Regards,<br/>Event Team</p>`;
                    }


                    const sent = await sendEmail({
                        to: p.email,
                        subject: subject,
                        text: textBody,
                        html: htmlBody,
                        attachments: [
                            {
                                filename: `Invitation-${p.ticket_id}.pdf`,
                                content: pdfBuffer,
                                contentType: 'application/pdf'
                            }
                        ]
                    });

                    if (sent) {
                        batch.update(doc.ref, { status: 'sent' });
                        successCount++;
                        results.push({ email: p.email, status: 'sent' });
                    } else {
                        failCount++;
                        results.push({ email: p.email, status: 'failed_email' });
                    }
                } else {
                    // No email provided, mark as 'generated' (no change) or 'no_email'
                    failCount++;
                    results.push({ name: p.name, status: 'no_email' });
                }

            } catch (err) {
                console.error(`Error processing ${p.email}:`, err);
                failCount++;
                results.push({ email: p.email, status: 'error' });
            }
        }

        // Commit status updates
        await batch.commit();

        return NextResponse.json({
            success: true,
            processed: successCount + failCount,
            successCount,
            failCount,
            message: `Sent ${successCount} emails. Failed: ${failCount}.`
        });

    } catch (error: any) {
        console.error('Email Batch Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
