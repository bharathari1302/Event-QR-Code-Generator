const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local for credentials
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
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

const db = admin.firestore();

async function debugEvent(eventId) {
    console.log(`\n=== Debugging Event: ${eventId} ===`);

    const participantsRef = db.collection('participants');
    const snapshot = await participantsRef.where('event_id', '==', eventId).get();

    if (snapshot.size === 0) {
        console.log(`No participants found for event ${eventId}.`);
        console.log(`Listing all events in the database:`);
        const eventsSnapshot = await db.collection('events').get();
        eventsSnapshot.forEach(doc => {
            console.log(`- ID: ${doc.id}, Name: ${doc.data().name}`);
        });
        return;
    }

    console.log(`Total participants in DB for this event: ${snapshot.size}`);

    const statusCounts = {};
    const emailMissing = [];
    const rollMissing = [];

    snapshot.forEach(doc => {
        const p = doc.data();
        const status = p.status || 'no-status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Check for ID issues
        if (p.event_id !== eventId) {
            console.log(`WARNING: Doc ${doc.id} has event_id mismatch! Expected "${eventId}", got "${p.event_id}"`);
        }

        if (!p.email) emailMissing.push(p.name);
        if (!p.rollNo) rollMissing.push(p.name);
    });

    console.log('\nStatus Breakdown:');
    console.log(JSON.stringify(statusCounts, null, 2));

    // Also check for 'generated' status without filtering by event_id just to see
    const totalGenerated = await participantsRef.where('status', '==', 'generated').get();
    console.log(`\nTotal 'generated' participants across ALL events: ${totalGenerated.size}`);

    console.log(`\nParticipants without Email: ${emailMissing.length}`);
    if (emailMissing.length > 0) console.log('Sample missing emails:', emailMissing.slice(0, 5).join(', '));

    console.log(`Participants without Roll No: ${rollMissing.length}`);

    // Check specifically for 'generated' status which is required for sending emails
    const generatedSnapshot = await participantsRef
        .where('event_id', '==', eventId)
        .where('status', '==', 'generated')
        .get();

    console.log(`\nParticipants with 'generated' status: ${generatedSnapshot.size}`);

    if (generatedSnapshot.size > 0) {
        console.log('\nSample Participant (First 2):');
        generatedSnapshot.docs.slice(0, 2).forEach(doc => {
            console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
        });
    }

    if (generatedSnapshot.size > 0 && generatedSnapshot.size < snapshot.size) {
        console.log('NOTE: Some participants were likely already sent emails (or have another status).');
    }
}

// Get the event ID from command line or use a fallback
const eventId = process.argv[2];
if (!eventId) {
    console.error('Please provide an eventId: node debug_sync.js <eventId>');
    process.exit(1);
}

debugEvent(eventId).catch(console.error);
