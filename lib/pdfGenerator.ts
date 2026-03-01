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
    singleMealName?: string; // backwards compatibility
    selectedMeals?: string[];
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

    // Build the requested meals list
    const requestedMeals: string[] = [];
    if (options.selectedMeals && options.selectedMeals.length > 0) {
        requestedMeals.push(...options.selectedMeals);
    } else if (options.singleMealName) {
        requestedMeals.push(options.singleMealName);
    }

    if (requestedMeals.length > 0) {
        const customMeals: typeof meals = [];
        for (const reqMeal of requestedMeals) {
            const match = meals.find(m => m.name.toLowerCase() === reqMeal.toLowerCase());
            if (match) {
                customMeals.push(match);
            } else {
                // If it's a completely custom typed meal name, fallback to blue colors
                customMeals.push({ name: reqMeal.toUpperCase(), color: [29, 78, 216], dark: [20, 55, 170] });
            }
        }
        meals = customMeals;
    }

    for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (i > 0) doc.addPage();

        const pw = 210;
        const ph = 297;
        const [r, g, b] = meal.color;
        const [dr, dg, db] = meal.dark;

        // ══════════════════════════════════════════
        // 1. HEADER BAND — full-width, 65mm tall
        // ══════════════════════════════════════════
        const hH = 65; // header height

        // Main band (full height, bright color)
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pw, hH, 'F');

        // Thin dark bottom strip — just 4mm for depth, does NOT interfere with text
        doc.setFillColor(dr, dg, db);
        doc.rect(0, hH - 4, pw, 4, 'F');

        // Decorative circle — top left (lighter shade)
        doc.setFillColor(Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 50, 255));
        doc.circle(-20, -5, 48, 'F');

        // Decorative circle — right (lighter shade)
        doc.setFillColor(Math.min(r + 30, 255), Math.min(g + 30, 255), Math.min(b + 30, 255));
        doc.circle(pw + 15, hH - 5, 35, 'F');

        // Small accent dot top-right
        doc.setFillColor(Math.min(r + 60, 255), Math.min(g + 60, 255), Math.min(b + 60, 255));
        doc.circle(168, 12, 18, 'F');

        // ── All text sits in the bright zone (well above the 4mm dark strip) ──

        // Meal name — large, bold, white
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(44);
        doc.setFont('helvetica', 'bold');
        doc.text(meal.name, pw / 2, 32, { align: 'center' });

        // Subtitle — smaller, slightly off-white, still on bright orange
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text('\u2014  MEAL ACCESS PASS  \u2014', pw / 2, 43, { align: 'center' });

        // Event name — small, white, clearly above dark strip
        const eLabel = (participant.event_name || 'EVENT').toUpperCase();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text(`INVITATION FOR ${eLabel}`, pw / 2, 53, { align: 'center' });

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
        // 3. PARTICIPANT INFO CARD — clean redesign
        // ══════════════════════════════════════════
        const cardX = 18;
        const cardY = accentY + 7;
        const cardW = pw - cardX * 2;
        const cardH = 48;
        const accentBarW = 5;

        // White card base with light colored border
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(
            Math.min(r + 130, 255),
            Math.min(g + 130, 255),
            Math.min(b + 130, 255)
        );
        doc.setLineWidth(0.5);
        doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

        // Thick left accent bar
        doc.setFillColor(r, g, b);
        doc.roundedRect(cardX, cardY, accentBarW, cardH, 2, 2, 'F');
        // Fill right side of bar to make it flush
        doc.rect(cardX + 2, cardY, accentBarW - 2, cardH, 'F');

        // Small colored label above the name ("HOSTEL ACCESS")
        doc.setTextColor(r, g, b);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('HOSTEL ACCESS', pw / 2, cardY + 10, { align: 'center' });

        // Thin rule below label
        doc.setDrawColor(
            Math.min(r + 150, 255),
            Math.min(g + 150, 255),
            Math.min(b + 150, 255)
        );
        doc.setLineWidth(0.3);
        doc.line(cardX + accentBarW + 6, cardY + 13, cardX + cardW - 6, cardY + 13);

        // Participant Name — large, dark
        doc.setTextColor(15, 15, 15);
        doc.setFontSize(23);
        doc.setFont('helvetica', 'bold');
        doc.text(participant.name.toUpperCase(), pw / 2, cardY + 25, { align: 'center' });

        // Roll No | Room No — neatly spaced
        const details: string[] = [];
        if (participant.rollNo) details.push(`Roll No: ${participant.rollNo}`);
        if (participant.roomNo) details.push(`Room No: ${participant.roomNo}`);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        if (details.length === 2) {
            const mid = pw / 2;
            doc.setTextColor(80, 80, 80);
            doc.text(details[0], mid - 3, cardY + 34, { align: 'right' });
            doc.setFillColor(180, 180, 180);
            doc.rect(mid - 0.5, cardY + 29, 1, 4, 'F');
            doc.setTextColor(80, 80, 80);
            doc.text(details[1], mid + 3, cardY + 34, { align: 'left' });
        } else if (details.length === 1) {
            doc.setTextColor(80, 80, 80);
            doc.text(details[0], pw / 2, cardY + 34, { align: 'center' });
        }

        // Food Preference badge
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'VEG';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');
            const prefFill: [number, number, number] = isVeg ? [220, 252, 231] : [254, 226, 226];
            const prefBorder: [number, number, number] = isVeg ? [134, 239, 172] : [252, 165, 165];
            const prefText: [number, number, number] = isVeg ? [21, 128, 61] : [185, 28, 28];

            const bW = 30, bH = 7;
            const bX = (pw - bW) / 2;
            const bY = cardY + cardH - 10;

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
