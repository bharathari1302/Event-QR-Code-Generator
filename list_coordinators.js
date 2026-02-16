const { adminDb } = require('./lib/firebaseAdmin');

async function listCoordinators() {
    try {
        const snapshot = await adminDb.collection('users').where('role', '==', 'coordinator').get();
        if (snapshot.empty) {
            console.log('No coordinators found.');
            return;
        }

        console.log('Coordinators found:');
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, RollNo: ${data.rollNo}, Dept: ${data.department}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

listCoordinators();
