const admin = require('firebase-admin');

const serviceAccount = {
    projectId: "event-invitation-e8a6e",
    clientEmail: "firebase-adminsdk-fbsvc@event-invitation-e8a6e.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCm2guZ18aVFoZi\nKJiHWT0+jstIICgt7a8b5wS1C5UkU68b0IcB/XygXrUNGL88kZt75zeJiTP4+aWO\nHgblbnXeqOoGIWB2cgI/STUyyhGIBqcnn5EzaBmhPCL3QhnzGlhS4JPBXm2hTDjO\nglvK/ZIAn0Uj1rwx8cRsu3spQIy2LAT3/1Yfk5I4FDgvu/BXxxZjwyKV+PjxhYxQ\nYoRO/UdgbDj66KWRPE0yIo1+G3IsNOAklh5LvtaC9QV7W0KUSG1j/BLdkTQxEmKM\naG5o9jeQKUpZdk8upXUSJRltMDUAW+tcgDW1nfTc9LcYLG4B3Js4jJuM8RnRVIbB\nFvGMvw9lAgMBAAECggEARUxvoAxmDprl4pPw0dpHHRnqpUCx322GGqUnJ9ixL37Q\nTlGcGUACiIr9UHy0RMBHHz2HrAh/vQtW7wFapOTtcLagSD6JlXhBpa5OuZMCmAgH\nWeYkxQCaEITtEtvx8i3BfF6JD7mb9++z8lVjMZqCjt6XtUxlKqs7BVwSya3lI23W\nPLmXcMmNhaDqlXUiKtnRo1IS0pes5RSbUKQ9lR7JmEUKfbGX53ZcfmAuS6PZ7ZXl\nlBjjPK+2E7vMnaZD4kvVjfUAZSq+6mVMf0lh5XMTbPLHH2Cp+lnZLAdEB7/oeS1D\nML1gm2I6yX86Rhwh/YyioATY248qUsPZNcPnVCe1uwKBgQDUsDjHiAk62W7JJK57\ni4K3jgDM30/O3NAtTQKRXg1a2EmidsPi8OA+p8vAJJS3BcQSPKnroWK71xYfasmP\neeTL0tmR5hqye6luor+EbXa75wQCpn29+OJgG6pYY61D4YVtb4SlbbZPrRsALQW5\nMVdqR25dQzuhG46uL6m9h36ilwKBgQDI1EnLCgcdZAf7d06ZVPW0+p6/49QUYY/F\nVmWpEhrwxKjsERdWn5EsDRYHNNX+9gGlEvhBt663Jd+x4HHbzYBGiHGq0A324Tij\n46kZsheQPRqAUhF97MQ/dedu6Fv/j6KAjyEa7WDcO30wqKAqoSj8xoSytXittnP9\nVf/3uqQpYwKBgA3AGtujit04I3Zznag1G81cK+cS5Oj906OqH+lgCEMASrprLTzl\nz8mdNYoFk2vFvqhjLaUjOOvl+vMrBz70ZXtb9V7+Xml9nzWc5f7cyNlbFSJKu0Rl\n69TE1R2DzDbgRK0PkabUUf4StfUr8/vGGd2wIo17BEblLjNKt5GeSeyfAoGBAI5w\nEs6RFC7CTe8K1ZJm8cYkoweSfU7fS2s5Ne1OTBFMSkr0bEsh7YMC3QbLcKPes5fy\n9mUV9DMuB5RPjjHJdRuRlp0B54Wcg+GpjLwO1iuVSwCMNJ/Nl/sykqzU3LtLkoQA\nAAjrJ/HLt6UVVFQn7bwqyN8/WpJKf8XEg0Ge/OPlAoGBAMIGUt6lRuiU7dZ+Rblu\nyNeRbmhIJ7Bj/p4LJ7brjJSkloE7FoxHLcIeopVvnKWm4CJPr9Pjv8z041OS+X0M\nG2SpNodqj1U4IV4VCSx2YQS4NTh7yzmssjhz5moZxtW2IzMsEpFSkA538WpFAp6M\nz258hLdtML+wS0aENpZ5V3hU\n-----END PRIVATE KEY-----".replace(/\\n/g, '\n')
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function createAccount(email, password, role) {
    try {
        let uid;
        try {
            const userRecord = await auth.createUser({
                email: email,
                password: password,
                displayName: role.charAt(0).toUpperCase() + role.slice(1)
            });
            uid = userRecord.uid;
            console.log(`Successfully created new user: ${email} (${uid})`);
        } catch (e) {
            if (e.code === 'auth/email-already-exists') {
                console.log(`User ${email} already exists. Fetching...`);
                const userRecord = await auth.getUserByEmail(email);
                uid = userRecord.uid;
            } else {
                throw e;
            }
        }

        await db.collection('users').doc(uid).set({
            uid: uid,
            email: email,
            role: role,
            department: 'IT', // Default
            createdAt: new Date()
        }, { merge: true });

        console.log(`Updated Firestore role for ${email} to ${role}`);

    } catch (error) {
        console.error(`Error creating ${email}:`, error);
    }
}

async function run() {
    await createAccount('admin@test.com', 'Admin@123', 'admin');
    await createAccount('manager@test.com', 'Manager@123', 'manager');
}

run();
