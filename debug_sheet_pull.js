const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Manually parse .env.local for credentials
const envPath = path.join(__dirname, '.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env.local');
}

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        env[match[1]] = value;
    }
});

async function checkSheetData() {
    // Temporarily disable TLS validation for local testing
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: env.FIREBASE_CLIENT_EMAIL,
                private_key: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // This is the sheet ID based on the screenshot/previous context
        const sheetId = '1g51F4wL00hT8S7f4o61p7qH9573Qv0C0l3l9f598v6Y';

        console.log(`Fetching from Sheet ID: ${sheetId}...`);

        let targetSheetName = "Form Responses 1";

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: targetSheetName,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in the sheet.');
            return;
        }

        console.log(`Total rows fetched (including header): ${rows.length}`);

        const rollIdx = rows[0].findIndex(h => h.toLowerCase().includes('roll'));

        if (rollIdx === -1) {
            console.log("Could not find a Roll No column!");
            return;
        }

        const rollSet = new Set();
        let emptyRolls = 0;
        let duplicatesInSheet = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const roll = row[rollIdx] ? row[rollIdx].trim().toUpperCase() : '';

            if (!roll) {
                emptyRolls++;
            } else if (rollSet.has(roll)) {
                duplicatesInSheet++;
            } else {
                rollSet.add(roll);
            }
        }

        console.log(`Unique Roll Nos: ${rollSet.size}`);
        console.log(`Empty Roll Nos: ${emptyRolls}`);
        console.log(`Exact duplicates (same Roll No repeated) in Sheet: ${duplicatesInSheet}`);

    } catch (err) {
        console.error("Error reading sheet:", err.message);
    }
}

checkSheetData();
