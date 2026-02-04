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

    // --- CASE 1: Event Invitation (Venue & Date provided) ---
    if (options.venue && options.eventDate) {
        const pageWidth = 210;
        const pageHeight = 297;

        // Background / Border
        doc.setDrawColor(63, 81, 181); // Indigo border
        doc.setLineWidth(2);
        doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

        // Header
        doc.setFillColor(63, 81, 181);
        doc.rect(10, 10, pageWidth - 20, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text("EVENT INVITATION", pageWidth / 2, 35, { align: "center" });

        // Event Name
        doc.setTextColor(63, 81, 181); // Theme color
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        const eName = (participant.event_name || 'EVENT').toUpperCase();
        doc.text(eName, pageWidth / 2, 75, { align: "center" });

        // Sub Event Name (if exists)
        if (participant.sub_event_name) {
            doc.setFontSize(16);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 100, 100);
            doc.text(`(${participant.sub_event_name})`, pageWidth / 2, 85, { align: "center" });
        }

        // Participant Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("We are pleased to invite", pageWidth / 2, 105, { align: "center" });

        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(participant.name, pageWidth / 2, 120, { align: "center" });

        if (participant.college) {
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text(`of ${participant.college}`, pageWidth / 2, 130, { align: "center" });
        }

        // Details Box
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(40, 145, 130, 45, 3, 3, 'S');

        const detailX = 50;
        let detailY = 160;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Date:", detailX, detailY);
        doc.setFont("helvetica", "normal");
        doc.text(options.eventDate, detailX + 30, detailY);

        detailY += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Venue:", detailX, detailY);
        doc.setFont("helvetica", "normal");
        doc.text(options.venue, detailX + 30, detailY);

        detailY += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Details:", detailX, detailY);
        doc.setFont("helvetica", "normal");
        doc.text("Please show the QR code below at entry.", detailX + 30, detailY);


        // QR Code (Center)
        // Payload: TOKEN|ENTRY (or just TOKEN, depending on scanners)
        // For events, usually checking attendance, so maybe 'ENTRY' or 'ATTENDANCE'
        const qrPayload = `${participant.token}|ATTENDANCE`;
        const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 400, margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', (pageWidth - 70) / 2, 205, 70, 70);

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Scan for Attendance", pageWidth / 2, 280, { align: "center" });
        doc.text(`ID: ${participant.ticket_id}`, pageWidth / 2, 285, { align: "center" });

        return Buffer.from(doc.output('arraybuffer'));
    }

    // --- CASE 2 & 3: Meal Coupons (Hostel Day / Special Dinner) ---
    let meals = [
        { name: 'BREAKFAST', color: [255, 152, 0] }, // Orange
        { name: 'LUNCH', color: [255, 87, 34] },     // Deep Orange
        { name: 'SNACKS', color: [156, 39, 176] },   // Purple
        { name: 'DINNER', color: [63, 81, 181] },    // Indigo
        { name: 'ICE CREAM', color: [233, 30, 99] }  // Pink
    ];

    // Case 2: Custom Single Meal
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
        // Payload: TOKEN|MEAL_TYPE
        const qrPayload = `${participant.token}|${meal.name.toLowerCase()}`;
        const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 400, margin: 1 });
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
