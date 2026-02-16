const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (key && !key.startsWith('#')) {
                env[key] = value;
            }
        }
    });
} catch (e) {
    console.error('Error reading .env.local:', e.message);
}

const serviceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkStatus() {
    try {
        console.log('Listing collections...');
        const collections = await db.listCollections();
        console.log('Collections:', collections.map(c => c.id));

        console.log('Checking participants...');
        const snapshot = await db.collection('participants').get();

        const counts = {};

        if (snapshot.empty) {
            console.log('No participants found.');
            return;
        }

        console.log(`Total participants: ${snapshot.size}`);

        snapshot.forEach(doc => {
            const data = doc.data();
            const status = data.status || 'undefined';
            counts[status] = (counts[status] || 0) + 1;
        });

        console.log('Status counts:', counts);
    } catch (e) {
        console.error('Error:', e);
    }
}

checkStatus();
