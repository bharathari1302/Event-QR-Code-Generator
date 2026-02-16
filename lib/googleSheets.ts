import { google } from 'googleapis';

export async function getSheetData(sheetId: string, sheetName?: string) {
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
}

export function parseParticipantRow(row: string[], headers: string[]) {
    const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const nameIdx = getIdx(['name', 'student name', 'participant']);
    const emailIdx = getIdx(['email', 'mail']);
    const rollNoIdx = getIdx(['roll', 'register', 'reg no']);
    const deptIdx = getIdx(['dept', 'department', 'branch']);
    const collegeIdx = getIdx(['college', 'institution']);
    const yearIdx = getIdx(['year']);
    const phoneIdx = getIdx(['phone', 'mobile', 'contact']);
    const foodIdx = getIdx(['food', 'veg', 'preference']);
    const roomIdx = getIdx(['room']);

    if (nameIdx === -1) return null; // Name is mandatory

    return {
        name: row[nameIdx] || null,
        email: emailIdx !== -1 ? (row[emailIdx] || null) : null,
        rollNo: rollNoIdx !== -1 ? (row[rollNoIdx]?.toUpperCase() || null) : null,
        department: deptIdx !== -1 ? (row[deptIdx] || null) : null,
        college: collegeIdx !== -1 ? (row[collegeIdx] || 'Kongu Engineering College') : 'Kongu Engineering College',
        year: yearIdx !== -1 ? (row[yearIdx] || null) : null,
        phone: phoneIdx !== -1 ? (row[phoneIdx] || null) : null,
        foodPreference: foodIdx !== -1 ? (row[foodIdx] || 'Veg') : 'Veg',
        roomNo: roomIdx !== -1 ? (row[roomIdx] || null) : null,
    };
}
