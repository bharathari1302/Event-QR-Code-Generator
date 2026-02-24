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

    let meals: { name: string; color: [number, number, number]; dark: [number, number, number] }[] = [
        { name: 'BREAKFAST', color: [255, 140, 0], dark: [200, 100, 0] },
        { name: 'LUNCH', color: [220, 38, 38], dark: [160, 20, 20] },
        { name: 'SNACKS', color: [109, 40, 217], dark: [80, 20, 170] },
        { name: 'DINNER', color: [29, 78, 216], dark: [20, 55, 170] },
        { name: 'ICE CREAM', color: [219, 39, 119], dark: [170, 20, 90] },
    ];

    if (options.singleMealName) {
        const match = meals.find(m => m.name.toLowerCase() === options.singleMealName!.toLowerCase());
        const color: [number, number, number] = match ? match.color : [29, 78, 216];
        const dark: [number, number, number] = match ? match.dark : [20, 55, 170];
        meals = [{ name: options.singleMealName.toUpperCase(), color, dark }];
    }

    for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (i > 0) doc.addPage();

        const pw = 210;
        const ph = 297;
        const [r, g, b] = meal.color;
        const [dr, dg, db] = meal.dark;

        // ══════════════════════════════════════════
        // 1. HEADER BAND — full-width, 68mm tall
        // ══════════════════════════════════════════
        const hH = 68; // header height

        // Main band
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pw, hH, 'F');

        // Darker bottom strip (depth)
        doc.setFillColor(dr, dg, db);
        doc.rect(0, hH - 10, pw, 10, 'F');

        // Decorative circle — top left (lighten)
        doc.setFillColor(Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 50, 255));
        doc.circle(-20, -5, 48, 'F');

        // Decorative circle — bottom right (lighten)
        doc.setFillColor(Math.min(r + 30, 255), Math.min(g + 30, 255), Math.min(b + 30, 255));
        doc.circle(pw + 15, hH + 5, 35, 'F');

        // Small accent dots (light fill — no opacity API needed)
        doc.setFillColor(
            Math.min(r + 60, 255),
            Math.min(g + 60, 255),
            Math.min(b + 60, 255)
        );
        doc.circle(160, 14, 20, 'F');
        doc.circle(184, 58, 12, 'F');

        // Meal name (big, bold, white)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(42);
        doc.setFont('helvetica', 'bold');
        doc.text(meal.name, pw / 2, 36, { align: 'center' });

        // Subtitle
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        doc.text('— MEAL ACCESS PASS —', pw / 2, 47, { align: 'center' });

        // Event name
        const eLabel = (participant.event_name || 'EVENT').toUpperCase();
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(230, 230, 230);
        doc.text(`INVITATION FOR ${eLabel}`, pw / 2, 57, { align: 'center' });

        // ══════════════════════════════════════════
        // 2. LOGO — centered below header, larger
        // ══════════════════════════════════════════
        const logoY = hH + 9;
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
            const logoW = 72;
            const logoH = 29;
            doc.addImage(logoBase64, 'PNG', (pw - logoW) / 2, logoY, logoW, logoH);
        }

        // Colored accent line under logo
        const accentY = logoY + 33;
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(1.0);
        doc.line(50, accentY, pw - 50, accentY);

        // ══════════════════════════════════════════
        // 3. PARTICIPANT INFO CARD
        // ══════════════════════════════════════════
        const cardX = 18;
        const cardY = accentY + 7;
        const cardW = pw - cardX * 2;
        const cardH = 50;

        // Card background — very light tint
        doc.setFillColor(
            Math.min(r + 215, 255),
            Math.min(g + 215, 255),
            Math.min(b + 215, 255)
        );
        doc.setDrawColor(
            Math.min(r + 160, 255),
            Math.min(g + 160, 255),
            Math.min(b + 160, 255)
        );
        doc.setLineWidth(0.4);
        doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, 'FD');

        // Dark header strip inside card
        doc.setFillColor(r, g, b);
        doc.roundedRect(cardX, cardY, cardW, 13, 5, 5, 'F');
        doc.setFillColor(r, g, b);
        doc.rect(cardX, cardY + 7, cardW, 6, 'F'); // fill the rounded bottom of top strip

        // "PARTICIPANT" label inside dark strip
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('PARTICIPANT', pw / 2, cardY + 9, { align: 'center' });

        // Participant Name
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(participant.name.toUpperCase(), pw / 2, cardY + 24, { align: 'center' });

        // Roll No | Room No
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);

        const details: string[] = [];
        if (participant.rollNo) details.push(`Roll No: ${participant.rollNo}`);
        if (participant.roomNo) details.push(`Room No: ${participant.roomNo}`);

        if (details.length === 2) {
            doc.text(details[0], pw / 2 - 2, cardY + 33, { align: 'right' });
            doc.setTextColor(180, 180, 180);
            doc.text('  |  ', pw / 2, cardY + 33, { align: 'center' });
            doc.setTextColor(70, 70, 70);
            doc.text(details[1], pw / 2 + 2, cardY + 33, { align: 'left' });
        } else if (details.length === 1) {
            doc.text(details[0], pw / 2, cardY + 33, { align: 'center' });
        }

        // Food Preference badge
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'VEG';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');
            const prefFill: [number, number, number] = isVeg ? [220, 252, 231] : [254, 226, 226];
            const prefBorder: [number, number, number] = isVeg ? [134, 239, 172] : [252, 165, 165];
            const prefText: [number, number, number] = isVeg ? [21, 128, 61] : [185, 28, 28];

            const bW = 28, bH = 7;
            const bX = (pw - bW) / 2;
            const bY = cardY + cardH - 11;

            doc.setFillColor(...prefFill);
            doc.setDrawColor(...prefBorder);
            doc.setLineWidth(0.4);
            doc.roundedRect(bX, bY, bW, bH, 3, 3, 'FD');

            doc.setTextColor(...prefText);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(pref, pw / 2, bY + 5, { align: 'center' });
        }

        // ══════════════════════════════════════════
        // 4. QR CODE — in a clean card
        // ══════════════════════════════════════════
        const qrY = cardY + cardH + 9;
        const qrSize = 82;

        let qUrl: string;
        const qPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        try {
            qUrl = await QRCode.toDataURL(qPayload, { width: 500, margin: 1, errorCorrectionLevel: 'H' });
        } catch {
            qUrl = await QRCode.toDataURL(qPayload, { width: 500 });
        }

        // QR card background
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(225, 225, 225);
        doc.setLineWidth(0.35);
        doc.roundedRect((pw - qrSize - 10) / 2, qrY - 5, qrSize + 10, qrSize + 10, 5, 5, 'FD');

        doc.addImage(qUrl, 'PNG', (pw - qrSize) / 2, qrY, qrSize, qrSize);

        // ══════════════════════════════════════════
        // 5. SCAN INSTRUCTION
        // ══════════════════════════════════════════
        const scanY = qrY + qrSize + 10;
        doc.setFontSize(9.5);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('Scan this QR Code at the counter for verification', pw / 2, scanY, { align: 'center' });

        // ══════════════════════════════════════════
        // 6. TICKET ID BADGE — perforated-style strip
        // ══════════════════════════════════════════
        // Perforated dashed line above the badge (manually drawn dashes)
        const perfY = scanY + 6;
        doc.setFillColor(200, 200, 200);
        const dashW = 3;
        const dashH = 0.5;
        const gapW = 2.5;
        let dashX = 20;
        while (dashX < pw - 20) {
            doc.rect(dashX, perfY - dashH / 2, dashW, dashH, 'F');
            dashX += dashW + gapW;
        }

        // Small dots on sides
        doc.circle(16, perfY, 1.2, 'F');
        doc.circle(pw - 16, perfY, 1.2, 'F');

        // Ticket ID pill
        const badgeW = 100;
        const badgeH = 11;
        const badgeX = (pw - badgeW) / 2;
        const badgeY = perfY + 4;

        doc.setFillColor(r, g, b);
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`TICKET ID: ${participant.ticket_id}`, pw / 2, badgeY + 7.5, { align: 'center' });

        // ══════════════════════════════════════════
        // 7. FOOTER — no overlapping line
        // ══════════════════════════════════════════
        doc.setFontSize(8.5);
        doc.setTextColor(170, 170, 170);
        doc.setFont('helvetica', 'normal');
        doc.text('Developed by BHARAT HARI S - AIML', pw / 2, ph - 8, { align: 'center' });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
