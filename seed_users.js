const fetch = require('node-fetch'); // Try relaying on local node_modules or global fetch if node 18+

async function createUsers() {
    const users = [
        {
            email: 'admin@atti.com',
            password: 'Password@123',
            role: 'admin'
        },
        {
            email: 'manager@atti.com',
            password: 'Password@123',
            role: 'manager'
        }
    ];

    console.log('Creating users...');

    for (const user of users) {
        try {
            const response = await fetch('http://localhost:3000/api/admin/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`[SUCCESS] Created ${user.role}: ${user.email}`);
            } else {
                const errorMsg = data.error || JSON.stringify(data);
                if (errorMsg.includes('already in use') || errorMsg.includes('exists')) {
                    console.log(`[EXISTING] ${user.role} already exists: ${user.email}`);
                } else {
                    console.log(`[FAILED] ${user.role}: ${errorMsg}`);
                }
            }

        } catch (error) {
            console.error(`[ERROR] Connection failed for ${user.role}:`, error);
        }
    }
}

// Handle Node version compatibility for fetch
if (!globalThis.fetch) {
    console.log("Global fetch not found, likely older Node version. Using basic http request if needed, but assuming Node 18+ for this Next.js project.");
    // In a typically Next.js env, Node 18+ is expected.
}

createUsers();
