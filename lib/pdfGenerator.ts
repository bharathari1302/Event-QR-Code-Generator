import jsPDF from 'jspdf';
import QRCode from 'qrcode';

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

        // Header Strip
        doc.setFillColor(meal.color[0], meal.color[1], meal.color[2] as number);
        doc.rect(0, 0, pageWidth, 40, 'F'); // Top Header

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(meal.name, pageWidth / 2, 25, { align: "center" });

        // Event Name
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        const eName = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(eName, pageWidth / 2, 55, { align: "center" });

        // --- Participant Details ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, pageWidth / 2, 75, { align: "center" });

        // Student Details Grid
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);

        const startY = 90;
        const gap = 10;

        if (participant.rollNo) {
            doc.text(`Roll No: ${participant.rollNo}`, pageWidth / 2, startY, { align: "center" });
        }

        if (participant.roomNo) {
            doc.text(`Room No: ${participant.roomNo}`, pageWidth / 2, startY + gap, { align: "center" });
        }

        // Food Preference (Badge Style)
        // Skip for Snacks and Ice Cream
        if (!['SNACKS', 'ICE CREAM'].includes(meal.name.toUpperCase())) {
            const pref = participant.foodPreference?.toUpperCase() || 'NOT SPECIFIED';
            const isVeg = pref.includes('VEG') && !pref.includes('NON');

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            if (isVeg) {
                doc.setTextColor(76, 175, 80); // Green
            } else {
                doc.setTextColor(211, 47, 47); // Red
            }
            doc.text(pref, pageWidth / 2, startY + gap * 2 + 5, { align: "center" });
        }


        // --- Large QR Code ---
        // Store ticket_id AND meal name for instant verification
        // Format: TICKET_ID|MEAL_NAME (e.g., INV-123456|breakfast)
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
            // Fallback: Try with token if ticket_id fails (legacy support)
            try {
                // Also append meal to token fallback
                qrDataUrl = await QRCode.toDataURL(`${participant.token}|${meal.name.toLowerCase()}`, {
                    width: 400,
                    margin: 1,
                    errorCorrectionLevel: 'M'
                });
            } catch (fallbackError) {
                console.error('Fallback QR generation also failed:', fallbackError);
                throw new Error('Unable to generate QR code for invitation');
            }
        }
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - 80) / 2, 140, 80, 80);

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text("Scan this QR Code at the counter", pageWidth / 2, 230, { align: "center" });
        doc.text(`ID: ${participant.ticket_id}`, pageWidth / 2, 235, { align: "center" });

        // --- Footer Credit (On Each Page) ---
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Developed by BHARAT HARI S - AIML", pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    return Buffer.from(doc.output('arraybuffer'));
}
