import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Load logo once and cache it as base64
let cachedLogoBase64: string | null = null;
function getLogoBase64() {
    if (cachedLogoBase64) return cachedLogoBase64;
    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
            const buffer = fs.readFileSync(logoPath);
            cachedLogoBase64 = `data:image/png;base64,${buffer.toString('base64')}`;
            return cachedLogoBase64;
        }
    } catch (e) {
        console.error('Logo loading failed:', e);
    }
    return null;
}

interface Participant {
    name: string;
    college: string;
    event_name: string;
    sub_event_name?: string;
    ticket_id: string;
    token: string;
    foodPreference?: string; // New
    roomNo?: string;         // New
    rollNo?: string;         // New - Added to interface
    eventId?: string;        // Event ID for verification
}

interface PDFOptions {
    singleMealName?: string;
    venue?: string;
    eventDate?: string;
}

export async function generateInvitationPDF(participant: Participant, options: PDFOptions = {}): Promise<Buffer> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4', // 210 x 297 mm
    });

    // --- CASE: Meal Coupons (Hostel Day / Special Dinner) ---
    // Default to strict list if not specified
    let meals = [
        { name: 'BREAKFAST', color: [255, 152, 0] }, // Orange
        { name: 'LUNCH', color: [255, 87, 34] },     // Deep Orange
        { name: 'SNACKS', color: [156, 39, 176] },   // Purple
        { name: 'DINNER', color: [63, 81, 181] },    // Indigo
        { name: 'ICE CREAM', color: [233, 30, 99] }  // Pink
    ];

    // Case: Custom Single Meal override
    if (options.singleMealName) {
        // Try to find a matching color if the name matches standard meals
        const standardMeal = meals.find(m => m.name.toLowerCase() === options.singleMealName!.toLowerCase());
        const color = standardMeal ? standardMeal.color : [63, 81, 181]; // Default to Indigo if custom

        meals = [{ name: options.singleMealName.toUpperCase(), color: color }];
    }

    // Loop to create coupons (One per Page)
    for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];

        // Add new page for subsequent meals (if not first)
        if (i > 0) doc.addPage();

        // --- Page Styling ---
        const pageWidth = 210;
        const pageHeight = 297;

        // --- 1. Authentic Ticket Stub Border ---
        const ticketMargin = 12;
        const ticketWidth = pageWidth - (ticketMargin * 2);
        const ticketHeight = 265;
        const startX = ticketMargin;
        const startY = 12;

        // Define Notch Geometry
        const notchRadius = 7;
        const notchY = startY + 115; // Centered stub division

        // Draw Border Segments to allow "punch-out" look
        doc.setDrawColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setLineWidth(1.2);

        // Top edge
        doc.line(startX, startY, startX + ticketWidth, startY);
        // Bottom edge
        doc.line(startX, startY + ticketHeight, startX + ticketWidth, startY + ticketHeight);

        // Left edge (broken by notch)
        doc.line(startX, startY, startX, notchY - notchRadius);
        doc.line(startX, notchY + notchRadius, startX, startY + ticketHeight);

        // Right edge (broken by notch)
        doc.line(startX + ticketWidth, startY, startX + ticketWidth, notchY - notchRadius);
        doc.line(startX + ticketWidth, notchY + notchRadius, startX + ticketWidth, startY + ticketHeight);

        // Draw the Notches (Circular cut-outs)
        doc.setFillColor(255, 255, 255);
        doc.circle(startX, notchY, notchRadius, 'FD');
        doc.circle(startX + ticketWidth, notchY, notchRadius, 'FD');

        // Add Perforation Line (Dashed)
        (doc as any).setLineDash([2, 1], 0);
        doc.setDrawColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.line(startX + notchRadius, notchY, startX + ticketWidth - notchRadius, notchY);
        (doc as any).setLineDash([], 0); // Reset dash


        // --- 2. Background Watermark (Aspect Ratio Fixed) ---
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
            try {
                // @ts-ignore
                const gState = new (doc as any).GState({ opacity: 0.15 });
                (doc as any).setGState(gState);
            } catch (e) { }

            // Q-Swift Logo is roughly 2.5:1 aspect ratio
            const wmWidth = 100;
            const wmHeight = 40;
            // Positioned behind header/details higher up
            doc.addImage(logoBase64, 'PNG', (pageWidth - wmWidth) / 2, startY + 35, wmWidth, wmHeight);

            try {
                // @ts-ignore
                const resetState = new (doc as any).GState({ opacity: 1.0 });
                (doc as any).setGState(resetState);
            } catch (e) { }
        }


        // --- 3. Header Section (Optimized Spacing) ---
        // Meal Name
        doc.setTextColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.text(meal.name, pageWidth / 2, startY + 28, { align: "center" });

        // Event Context
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(13);
        doc.setFont("helvetica", "normal");
        const eName = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(`INVITATION FOR ${eName}`, pageWidth / 2, startY + 38, { align: "center" });

        // --- Participant Details ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, pageWidth / 2, startY + 70, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        let detailsY = startY + 80;
        if (participant.rollNo) {
            doc.text(`Roll No: ${participant.rollNo}`, pageWidth / 2, detailsY, { align: "center" });
            detailsY += 8;
        }

        if (participant.roomNo) {
            doc.text(`Room No: ${participant.roomNo}`, pageWidth / 2, detailsY, { align: "center" });
            detailsY += 8;
        }

        // Food Preference Badge
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'NOT SPECIFIED';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');

            doc.setFontSize(15);
            doc.setFont("helvetica", "bold");
            if (isVeg) {
                doc.setTextColor(76, 175, 80); // Green
            } else {
                doc.setTextColor(211, 47, 47); // Red
            }
            doc.text(pref, pageWidth / 2, detailsY + 5, { align: "center" });
        }


        // --- 4. QR Code & Validation (Stub Segment) ---
        let qrPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        let qrDataUrl;
        try {
            qrDataUrl = await QRCode.toDataURL(qrPayload, {
                width: 400,
                margin: 1,
                errorCorrectionLevel: 'H'
            });
        } catch (error) {
            try {
                qrDataUrl = await QRCode.toDataURL(`${participant.token}|${meal.name.toLowerCase()}`, { width: 400 });
            } catch (fallbackError) {
                throw new Error('QR failed');
            }
        }

        const qrSize = 85;
        // Positioned in the "Stub" area (below notches)
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2, notchY + 20, qrSize, qrSize);

        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Scan this QR Code at the counter for verification", pageWidth / 2, notchY + 110, { align: "center" });

        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "bold");
        doc.text(`TICKET ID: ${participant.ticket_id}`, pageWidth / 2, notchY + 118, { align: "center" });

        // --- 5. Final Professional Footer ---
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Developed by BHARAT HARI S - AIML", pageWidth / 2, pageHeight - 15, { align: "center" });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
