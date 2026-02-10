// Debug script to check participant event_id values
const admin = require('firebase-admin');
const path = require('path');

// Initialize if not already
if (!admin.apps.length) {
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function debug() {
    const targetEventId = 'dOTVYiRHgfVBICczaRrz';

    // 1. Check with exact query (same as api/stats/details)
    console.log('=== Query with event_id ===');
    const snapshot1 = await db.collection('participants')
        .where('event_id', '==', targetEventId)
        .limit(5)
        .get();
    console.log(`Found ${snapshot1.size} participants with event_id=${targetEventId}`);

    // 2. Get a few participants and check their event_id field
    console.log('\n=== First 3 participants (any event) ===');
    const snapshot2 = await db.collection('participants')
        .limit(3)
        .get();
    snapshot2.forEach(doc => {
        const data = doc.data();
        console.log(`  Doc ${doc.id}: event_id="${data.event_id}" | eventId="${data.eventId}" | name="${data.name}" | tokenUsage=`, JSON.stringify(data.tokenUsage));
    });

    // 3. Check total participants count
    console.log('\n=== Total participants count ===');
    const allSnapshot = await db.collection('participants').get();
    console.log(`Total participants in collection: ${allSnapshot.size}`);

    // 4. Check unique event_id values
    const eventIds = new Set();
    allSnapshot.forEach(doc => {
        const data = doc.data();
        eventIds.add(data.event_id || 'MISSING');
    });
    console.log('Unique event_id values:', [...eventIds]);
}

debug().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
