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
        const startY = 20;

        // --- 1. Top Centered Logo ---
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
            const logoW = 50;
            const logoH = 20; // approx 2.5:1
            doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, startY, logoW, logoH);
        }

        // --- 2. Meal Header ---
        doc.setTextColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setFontSize(36);
        doc.setFont("helvetica", "bold");
        doc.text(meal.name, pageWidth / 2, startY + 40, { align: "center" });

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        const eLabel = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(`INVITATION FOR ${eLabel}`, pageWidth / 2, startY + 48, { align: "center" });

        // Subtle Horizontal Divider
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(40, startY + 58, pageWidth - 40, startY + 58);

        // --- 3. Participant Details ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name.toUpperCase(), pageWidth / 2, startY + 75, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        let dY = startY + 85;
        if (participant.rollNo) {
            doc.text(`Roll No: ${participant.rollNo}`, pageWidth / 2, dY, { align: "center" });
            dY += 8;
        }

        if (participant.roomNo) {
            doc.text(`Room No: ${participant.roomNo}`, pageWidth / 2, dY, { align: "center" });
            dY += 8;
        }

        // Food Preference
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'VEG';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');
            doc.setFontSize(15);
            doc.setFont("helvetica", "bold");
            if (isVeg) {
                doc.setTextColor(76, 175, 80); // Green
            } else {
                doc.setTextColor(211, 47, 47); // Red
            }
            doc.text(pref, pageWidth / 2, dY + 8, { align: "center" });
        }

        // --- 4. Large Centered QR Code ---
        let qPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        let qUrl;
        try {
            qUrl = await QRCode.toDataURL(qPayload, { width: 400, margin: 1, errorCorrectionLevel: 'H' });
        } catch (error) {
            qUrl = await QRCode.toDataURL(`${participant.token}|${meal.name.toLowerCase()}`, { width: 400 });
        }

        const qSSize = 85;
        doc.addImage(qUrl, 'PNG', (pageWidth - qSSize) / 2, startY + 120, qSSize, qSSize);

        // Verification Instructions
        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Scan this QR Code at the counter for verification", pageWidth / 2, startY + 215, { align: "center" });

        // Ticket ID
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`TICKET ID: ${participant.ticket_id}`, pageWidth / 2, startY + 223, { align: "center" });

        // --- 5. Clean Footer ---
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Developed by BHARAT HARI S - AIML", pageWidth / 2, pageHeight - 15, { align: "center" });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
