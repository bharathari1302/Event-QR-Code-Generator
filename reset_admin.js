const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[key] = value;
    }
});

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

async function resetAdmin() {
    const email = 'admin@test.com'; // Default admin email
    const password = 'admin'; // Default password

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Check if user exists
        const snapshot = await db.collection('users').where('email', '==', email).get();

        if (snapshot.empty) {
            console.log('User not found. Creating new admin...');
            await db.collection('users').add({
                email,
                passwordHash: hash,
                role: 'admin',
                department: 'CSE',
                name: 'Admin User',
                createdAt: new Date()
            });
            console.log('Admin user created successfully.');
        } else {
            console.log('User found. Updating password...');
            const doc = snapshot.docs[0];
            await doc.ref.update({
                passwordHash: hash,
                role: 'admin' // Ensure role is admin
            });
            console.log('Admin password updated successfully.');
        }
        console.log(`Login with: ${email} / ${password}`);
    } catch (error) {
        console.error('Error resetting admin:', error);
    }
}

resetAdmin();
