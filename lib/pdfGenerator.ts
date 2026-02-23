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

        // 1. Add Premium Side Strip (Vibrant visual cue)
        doc.setFillColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.rect(0, 0, 5, pageHeight, 'F');

        // 2. Add Background Watermark (Subtle and Professional)
        const logoBase64 = getLogoBase64();
        if (logoBase64) {
            // Use Graphics State for high transparency watermark if available
            try {
                // @ts-ignore - GState is supported by jsPDF but often missing from basic definitions
                const gState = new (doc as any).GState({ opacity: 0.08 });
                (doc as any).setGState(gState);
            } catch (e) {
                // Fallback for environments where GState isn't easily accessible
                console.warn('GState not supported, watermark may be more opaque');
            }

            const wmSize = 120;
            // Shifted slightly right to account for side strip
            doc.addImage(logoBase64, 'PNG', (pageWidth - wmSize) / 2 + 2.5, (pageHeight - wmSize) / 2, wmSize, wmSize);

            // Reset state for subsequent drawings
            try {
                // @ts-ignore
                const resetState = new (doc as any).GState({ opacity: 1.0 });
                (doc as any).setGState(resetState);
            } catch (e) { }
        }

        // 3. Header Section (Utilizing the space from removed logo)
        // Meal Name - Primary Header
        doc.setTextColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.setFontSize(36);
        doc.setFont("helvetica", "bold");
        doc.text(meal.name, pageWidth / 2 + 2.5, 35, { align: "center" });

        // Event Context - Sub Header
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        const eName = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(`INVITATION FOR ${eName}`, pageWidth / 2 + 2.5, 45, { align: "center" });

        // --- Participant Details Card ---
        // Subtle divider
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.5);
        doc.line(40, 60, 170, 60);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, pageWidth / 2 + 2.5, 75, { align: "center" });

        // Student Specifics
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);

        let detailsY = 85;
        if (participant.rollNo) {
            doc.text(`Roll No: ${participant.rollNo}`, pageWidth / 2 + 2.5, detailsY, { align: "center" });
            detailsY += 8;
        }

        if (participant.roomNo) {
            doc.text(`Room No: ${participant.roomNo}`, pageWidth / 2 + 2.5, detailsY, { align: "center" });
            detailsY += 8;
        }

        // Food Preference Badge
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'NOT SPECIFIED';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if (isVeg) {
                doc.setTextColor(76, 175, 80); // Green
            } else {
                doc.setTextColor(211, 47, 47); // Red
            }
            doc.text(pref, pageWidth / 2 + 2.5, detailsY + 5, { align: "center" });
        }


        // --- Large QR Code - Bottom Section ---
        let qrPayload = `${participant.ticket_id}|${meal.name.toLowerCase()}`;
        let qrDataUrl;
        try {
            qrDataUrl = await QRCode.toDataURL(qrPayload, {
                width: 400,
                margin: 1,
                errorCorrectionLevel: 'M',
                type: 'image/png'
            });
        } catch (error) {
            console.error('QR Code generation error:', error);
            try {
                qrDataUrl = await QRCode.toDataURL(`${participant.token}|${meal.name.toLowerCase()}`, {
                    width: 400,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                });
            } catch (fallbackError) {
                throw new Error('Unable to generate QR code');
            }
        }

        // Center the QR Code
        const qrSize = 85;
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - qrSize) / 2 + 2.5, 130, qrSize, qrSize);

        doc.setFontSize(11);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Scan this QR Code at the counter for verification", pageWidth / 2 + 2.5, 230, { align: "center" });
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "bold");
        doc.text(`TICKET ID: ${participant.ticket_id}`, pageWidth / 2 + 2.5, 238, { align: "center" });

        // --- Footer Credit ---
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Developed by BHARAT HARI S - AIML", pageWidth / 2 + 2.5, pageHeight - 15, { align: "center" });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
