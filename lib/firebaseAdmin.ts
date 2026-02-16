import * as admin from 'firebase-admin';

// Lazy initialization - only connect to Firebase when actually needed at runtime
// This prevents build-time errors on Vercel when env vars aren't available
function getFirestore() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '').trim()
                    : undefined,
            }),
        });
    }
    return admin.firestore();
}

// Use a proxy so that `adminDb.collection(...)` works seamlessly
// but initialization only happens on first access
const adminDb = new Proxy({} as admin.firestore.Firestore, {
    get(_target, prop) {
        const db = getFirestore();
        const value = (db as any)[prop];
        if (typeof value === 'function') {
            return value.bind(db);
        }
        return value;
    },
});

// Getter for Auth
function getAuth() {
    if (!admin.apps.length) {
        // Reuse initialization logic (could be refactored but safe to repeat check)
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
                privateKey: process.env.FIREBASE_PRIVATE_KEY
                    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '')
                    : undefined,
            }),
        });
    }
    return admin.auth();
}

const adminAuth = new Proxy({} as admin.auth.Auth, {
    get(_target, prop) {
        const auth = getAuth();
        const value = (auth as any)[prop];
        if (typeof value === 'function') {
            return value.bind(auth);
        }
        return value;
    },
});

export { adminDb, adminAuth };
