const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

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

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const adminDb = admin.firestore();

async function getEventSheetId() {
    const eventId = 'AC4RIbYiZjVHNB5Qfwwb';
    const doc = await adminDb.collection('events').doc(eventId).get();
    if (doc.exists) {
        console.log("Event configuration:");
        console.log(`googleSheetId: ${doc.data().googleSheetId}`);
        console.log(`googleSheetName: ${doc.data().googleSheetName}`);
    } else {
        console.log("Event not found");
    }
}

getEventSheetId();
