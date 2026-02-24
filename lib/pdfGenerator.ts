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
    foodPreference?: string;
    roomNo?: string;
    rollNo?: string;
    eventId?: string;
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

    let meals: { name: string; color: [number, number, number]; accent: [number, number, number] }[] = [
        { name: 'BREAKFAST', color: [255, 140, 0], accent: [255, 100, 0] },
        { name: 'LUNCH', color: [220, 38, 38], accent: [185, 28, 28] },
        { name: 'SNACKS', color: [124, 58, 237], accent: [109, 40, 217] },
        { name: 'DINNER', color: [37, 99, 235], accent: [29, 78, 216] },
        { name: 'ICE CREAM', color: [236, 72, 153], accent: [219, 39, 119] },
    ];

    if (options.singleMealName) {
        const standardMeal = meals.find(m => m.name.toLowerCase() === options.singleMealName!.toLowerCase());
        const color: [number, number, number] = standardMeal ? standardMeal.color : [37, 99, 235];
        const accent: [number, number, number] = standardMeal ? standardMeal.accent : [29, 78, 216];
        meals = [{ name: options.singleMealName.toUpperCase(), color, accent }];
    }

    for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (i > 0) doc.addPage();

        const pw = 210;  // page width mm
        const ph = 297;  // page height mm
        const [r, g, b] = meal.color;
        const [ar, ag, ab] = meal.accent;

        // ─────────────────────────────────────────
        // 1. Full-width gradient-style header band
        // ─────────────────────────────────────────
        const headerH = 58;

        // Main color fill
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pw, headerH, 'F');

        // Darker accent strip at bottom of header (gives depth)
        doc.setFillColor(ar, ag, ab);
        doc.rect(0, headerH - 8, pw, 8, 'F');

        // Left decorative circle (large, semi-transparent effect with lighter shade)
        doc.setFillColor(
            Math.min(r + 40, 255),
            Math.min(g + 40, 255),
            Math.min(b + 40, 255)
        );
        doc.circle(-18, 28, 38, 'F');

        // Right decorative circle
        doc.setFillColor(
            Math.min(r + 20, 255),
            Math.min(g + 20, 255),
            Math.min(b + 20, 255)
        );
        doc.circle(pw + 12, 12, 28, 'F');

        // Meal name in header
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(38);
        doc.setFont('helvetica', 'bold');
        doc.text(meal.name, pw / 2, 32, { align: 'center' });

        // Event name sub-label in header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        const eLabel = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(`INVITATION FOR ${eLabel}`, pw / 2, 45, { align: 'center' });

        // ─────────────────────────────────────────
        // 2. Logo — larger, centered below header
        // ─────────────────────────────────────────
        const logoBase64 = getLogoBase64();
        const logoY = headerH + 8;
        if (logoBase64) {
            const logoW = 70;
            const logoH = 28;
            doc.addImage(logoBase64, 'PNG', (pw - logoW) / 2, logoY, logoW, logoH);
        }

        // ─────────────────────────────────────────
        // 3. Thin color accent divider
        // ─────────────────────────────────────────
        const dividerY = logoY + 34;
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.8);
        doc.line(30, dividerY, pw - 30, dividerY);

        // ─────────────────────────────────────────
        // 4. Participant Info Card (light tinted box)
        // ─────────────────────────────────────────
        const cardY = dividerY + 6;
        const cardH = 44;
        const cardPad = 20;

        // Card background — very light tint of meal color
        doc.setFillColor(
            Math.min(r + 210, 255),
            Math.min(g + 210, 255),
            Math.min(b + 210, 255)
        );
        doc.roundedRect(cardPad, cardY, pw - cardPad * 2, cardH, 4, 4, 'F');

        // Left accent bar on card
        doc.setFillColor(r, g, b);
        doc.roundedRect(cardPad, cardY, 4, cardH, 2, 2, 'F');

        // Participant Name
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(participant.name.toUpperCase(), pw / 2, cardY + 15, { align: 'center' });

        // Roll No & Room No
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);

        let detailY = cardY + 25;
        const details: string[] = [];
        if (participant.rollNo) details.push(`Roll No: ${participant.rollNo}`);
        if (participant.roomNo) details.push(`Room No: ${participant.roomNo}`);

        if (details.length === 2) {
            doc.text(details[0], pw / 2 - 2, detailY, { align: 'right' });
            doc.setTextColor(180, 180, 180);
            doc.text('  |  ', pw / 2, detailY, { align: 'center' });
            doc.setTextColor(80, 80, 80);
            doc.text(details[1], pw / 2 + 2, detailY, { align: 'left' });
        } else if (details.length === 1) {
            doc.text(details[0], pw / 2, detailY, { align: 'center' });
        }

        // Food Preference Badge
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'VEG';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');
            const prefColor: [number, number, number] = isVeg ? [21, 128, 61] : [185, 28, 28];
            const prefBg: [number, number, number] = isVeg ? [220, 252, 231] : [254, 226, 226];

            // Badge background
            const badgeW = 32;
            const badgeH = 8;
            const badgeX = (pw - badgeW) / 2;
            const badgeY = cardY + cardH - 13;

            doc.setFillColor(...prefBg);
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, 'F');
            doc.setTextColor(...prefColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(pref, pw / 2, badgeY + 5.5, { align: 'center' });
        }

        // ─────────────────────────────────────────
        // 5. Large QR Code — centered
        // ─────────────────────────────────────────
        const qrY = cardY + cardH + 10;
        const qrSize = 90;

        let qUrl: string;
        const qPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        try {
            qUrl = await QRCode.toDataURL(qPayload, { width: 500, margin: 1, errorCorrectionLevel: 'H' });
        } catch {
            qUrl = await QRCode.toDataURL(qPayload, { width: 500 });
        }

        // QR white card shadow/bg
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect((pw - qrSize - 8) / 2, qrY - 4, qrSize + 8, qrSize + 8, 4, 4, 'FD');

        doc.addImage(qUrl, 'PNG', (pw - qrSize) / 2, qrY, qrSize, qrSize);

        // ─────────────────────────────────────────
        // 6. Scan instruction & Ticket ID badge
        // ─────────────────────────────────────────
        const afterQR = qrY + qrSize + 12;

        doc.setFontSize(10);
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');
        doc.text('Scan this QR Code at the counter for verification', pw / 2, afterQR, { align: 'center' });

        // Ticket ID pill badge
        const ticketLabel = `TICKET ID: ${participant.ticket_id}`;
        const ticketBadgeW = 90;
        const ticketBadgeH = 9;
        const ticketBadgeX = (pw - ticketBadgeW) / 2;
        const ticketBadgeY = afterQR + 5;

        doc.setFillColor(r, g, b);
        doc.roundedRect(ticketBadgeX, ticketBadgeY, ticketBadgeW, ticketBadgeH, 4, 4, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(ticketLabel, pw / 2, ticketBadgeY + 6, { align: 'center' });

        // ─────────────────────────────────────────
        // 7. Footer
        // ─────────────────────────────────────────
        // Thin top line above footer
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(30, ph - 22, pw - 30, ph - 22);

        doc.setFontSize(9);
        doc.setTextColor(160, 160, 160);
        doc.setFont('helvetica', 'normal');
        doc.text('Developed by BHARAT HARI S - AIML', pw / 2, ph - 14, { align: 'center' });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
