const { adminDb } = require('./lib/firebaseAdmin');

async function listUsers() {
    try {
        const snapshot = await adminDb.collection('users').get();
        if (snapshot.empty) {
            console.log('No users found in "users" collection.');
            return;
        }

        console.log('Users found:');
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}, Email: ${data.email}, Role: ${data.role}, HasHash: ${!!data.passwordHash}`);
        });
    } catch (error) {
        console.error('Error listing users:', error);
    }
}

listUsers();
