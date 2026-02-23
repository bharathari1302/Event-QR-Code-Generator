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

        // --- 1. Premium Angled-Corner Border ---
        const ticketMargin = 15;
        const ticketWidth = pageWidth - (ticketMargin * 2);
        const ticketHeight = 260;
        const startX = ticketMargin;
        const startY = 15;
        const clip = 6; // 6mm corner clipping

        doc.setDrawColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setLineWidth(1.5);

        // Draw clipped-corner border manually
        // Top-Left clip to Top-Right clip
        doc.line(startX + clip, startY, startX + ticketWidth - clip, startY);
        // Top-Right clip down
        doc.line(startX + ticketWidth - clip, startY, startX + ticketWidth, startY + clip);
        doc.line(startX + ticketWidth, startY + clip, startX + ticketWidth, startY + ticketHeight - clip);
        // Bottom-Right clip
        doc.line(startX + ticketWidth, startY + ticketHeight - clip, startX + ticketWidth - clip, startY + ticketHeight);
        doc.line(startX + ticketWidth - clip, startY + ticketHeight, startX + clip, startY + ticketHeight);
        // Bottom-Left clip
        doc.line(startX + clip, startY + ticketHeight, startX, startY + ticketHeight - clip);
        doc.line(startX, startY + ticketHeight - clip, startX, startY + clip);
        // Top-Left clip closing
        doc.line(startX, startY + clip, startX + clip, startY);

        // --- 2. Solid Logo Header (Professional Branding) ---
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
            const logoW = 60;
            const logoH = 24; // approx 2.5:1
            doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, startY + 12, logoW, logoH);
        }

        // --- 3. Meal Type & Information ---
        doc.setTextColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setFontSize(32);
        doc.setFont("helvetica", "bold");
        doc.text(meal.name, pageWidth / 2, startY + 52, { align: "center" });

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        const eventLabel = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(`OFFICIAL INVITATION • ${eventLabel}`, pageWidth / 2, startY + 60, { align: "center" });

        // Participant Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, pageWidth / 2, startY + 85, { align: "center" });

        doc.setFontSize(13);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        let detailsY = startY + 95;
        if (participant.rollNo) {
            doc.text(`Roll No: ${participant.rollNo}`, pageWidth / 2, detailsY, { align: "center" });
            detailsY += 7;
        }

        if (participant.roomNo) {
            doc.text(`Room No: ${participant.roomNo}`, pageWidth / 2, detailsY, { align: "center" });
            detailsY += 7;
        }

        // Food Preference
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'VEG';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if (isVeg) {
                doc.setTextColor(76, 175, 80);
            } else {
                doc.setTextColor(211, 47, 47);
            }
            doc.text(pref, pageWidth / 2, detailsY + 5, { align: "center" });
        }


        // --- 4. Stub Division (Perforation) ---
        const stubY = startY + 140;
        const notchR = 8;

        // Larger semi-circular notches
        doc.setFillColor(255, 255, 255);
        doc.circle(startX, stubY, notchR, 'FD');
        doc.circle(startX + ticketWidth, stubY, notchR, 'FD');

        // Dashed Perforation
        (doc as any).setLineDash([2, 1], 0);
        doc.setDrawColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.line(startX + notchR, stubY, startX + ticketWidth - notchR, stubY);
        (doc as any).setLineDash([], 0);


        // --- 5. QR Code "Stub" area ---
        let qrPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        let qrDataUrl;
        try {
            qrDataUrl = await QRCode.toDataURL(qrPayload, {
                width: 400,
                margin: 1,
                errorCorrectionLevel: 'H'
            });
        } catch (error) {
            qrDataUrl = await QRCode.toDataURL(`${participant.token}|${meal.name.toLowerCase()}`, { width: 400 });
        }

        const qrS = 80;
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrS) / 2, stubY + 20, qrS, qrS);

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("SCAN FOR ADMISSION", pageWidth / 2, stubY + 108, { align: "center" });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`TICKET: ${participant.ticket_id}`, pageWidth / 2, stubY + 115, { align: "center" });

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("System Powered by Q-Swift • developed by BHARAT HARI S - AIML", pageWidth / 2, pageHeight - 15, { align: "center" });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
