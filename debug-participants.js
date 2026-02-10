
const { adminDb } = require('./lib/firebaseAdmin');

async function checkParticipants() {
    try {
        const snapshot = await adminDb.collection('participants').limit(5).get();
        if (snapshot.empty) {
            console.log('No participants found.');
            return;
        }

        snapshot.forEach(doc => {
            console.log('Participant:', doc.id);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log('---');
        });
    } catch (error) {
        console.error('Error fetching participants:', error);
    }
}

checkParticipants();
