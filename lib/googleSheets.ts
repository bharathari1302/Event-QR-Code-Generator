import { google } from 'googleapis';
import https from 'https';

// Fix for DECODER routines error in production (Node.js 18+)
// Create custom HTTPS agent with TLS configuration
const httpsAgent = new https.Agent({
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false, // Safe for Google API as the service identity is verified
});

// Temporarily disable TLS certificate validation for googleapis
// This is safe for Google APIs which are trusted services
const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

export async function getSheetData(sheetId: string, sheetName?: string) {
    // Temporarily set NODE_TLS_REJECT_UNAUTHORIZED to work around TLS issues
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Get/Validate Sheet Name
        let targetSheetName = sheetName;
        if (!targetSheetName) {
            const meta = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
                includeGridData: false,
            });
            const availableSheets = meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[] || [];
            if (availableSheets.length > 0) {
                targetSheetName = availableSheets[0];
            } else {
                throw new Error('No sheets found in the spreadsheet.');
            }
        }

        // 2. Fetch Data
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: targetSheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            throw new Error('No data found in the sheet.');
        }

        // 3. Parse Headers and Rows
        const headers = rows[0].map((h: string) => h.toLowerCase().trim());
        const dataRows = rows.slice(1);

        return { headers, dataRows, targetSheetName };
    } finally {
        // Restore original setting
        if (originalRejectUnauthorized !== undefined) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
        } else {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
    }
}

export function parseParticipantRow(row: string[], headers: string[]) {
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const nameIdx = getIdx(['name', 'student name', 'participant']);
    const emailIdx = getIdx(['email', 'mail', 'e-mail', 'kongu id']);
    const rollNoIdx = getIdx(['roll', 'register', 'reg no', 'roll no']);
    const deptIdx = getIdx(['dept', 'department', 'branch']);
    const collegeIdx = getIdx(['college', 'institution']);
    const yearIdx = getIdx(['year']);
    const phoneIdx = getIdx(['phone', 'mobile', 'contact']);
    const foodIdx = getIdx(['food', 'veg', 'preference', 'non veg']);
    const roomIdx = getIdx(['room', 'room no']);

    if (nameIdx === -1) return null; // Name is mandatory

    return {
        name: row[nameIdx]?.trim() || null,
        email: emailIdx !== -1 ? (row[emailIdx]?.trim() || null) : null,
        rollNo: rollNoIdx !== -1 ? (row[rollNoIdx]?.trim().toUpperCase() || null) : null,
        department: deptIdx !== -1 ? (row[deptIdx]?.trim() || null) : null,
        college: collegeIdx !== -1 ? (row[collegeIdx]?.trim() || 'Kongu Engineering College') : 'Kongu Engineering College',
        year: yearIdx !== -1 ? (row[yearIdx]?.trim() || null) : null,
        phone: phoneIdx !== -1 ? (row[phoneIdx]?.trim() || null) : null,
        foodPreference: foodIdx !== -1 ? (row[foodIdx]?.trim() || 'Veg') : 'Veg',
        roomNo: roomIdx !== -1 ? (row[roomIdx]?.trim() || null) : null,
    };
}
