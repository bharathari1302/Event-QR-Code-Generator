const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

if (!admin.apps.length) {
    const serviceAccount = {
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (err) {
        console.error("Error loading service account:", err.message);
        process.exit(1);
    }
}

const adminDb = admin.firestore();

async function checkDuplicates() {
    const eventId = process.argv[2] || 'AC4RIbYiZjVHNB5Qfwwb';
    console.log(`\n=== Checking Participants for Event: ${eventId} ===\n`);

    const snapshot = await adminDb.collection('participants')
        .where('event_id', '==', eventId)
        .get();

    console.log(`Total participants in DB for this event: ${snapshot.size}`);

    const rollNoCounts = {};
    let missingRollNo = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        const rollNo = data.rollNo ? data.rollNo.toUpperCase().trim() : '';
        if (!rollNo) {
            missingRollNo++;
        } else {
            if (!rollNoCounts[rollNo]) rollNoCounts[rollNo] = [];
            rollNoCounts[rollNo].push({ id: doc.id, name: data.name, status: data.status, created_at: data.created_at ? data.created_at.toDate() : 'N/A' });
        }
    });

    console.log(`Participants missing Roll No: ${missingRollNo}`);

    let duplicateCount = 0;
    for (const [rollNo, docs] of Object.entries(rollNoCounts)) {
        if (docs.length > 1) {
            duplicateCount++;
            console.log(`Duplicate Roll No: ${rollNo} (${docs.length} entries)`);
            docs.forEach((d, i) => {
                console.log(`   ${i + 1}. Document ID: ${d.id}, Name: ${d.name}, Status: ${d.status}, Created: ${d.created_at}`);
            });
            console.log('---');
        }
    }

    console.log(`Total unique Roll Nos with duplicates: ${duplicateCount}`);

    // Check how many have 'generated' status right now
    const generatedCount = snapshot.docs.filter(d => d.data().status === 'generated').length;
    console.log(`\nTotal currently with 'generated' status: ${generatedCount}`);

    // Check how many have 'sent' status
    const sentCount = snapshot.docs.filter(d => d.data().status === 'sent').length;
    console.log(`Total currently with 'sent' status: ${sentCount}`);
}

checkDuplicates().catch(console.error);
