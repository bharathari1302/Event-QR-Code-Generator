const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Manually verify .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                process.env[key] = value.replace(/^"(.*)"$/, '$1');
            }
        }
    });
} else {
    console.error('.env.local file not found!');
}

console.log('Testing Email Configuration...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Missing');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Missing');

async function testConfig(name, config) {
    console.log(`\n--- Testing ${name} ---`);
    const transporter = nodemailer.createTransport({
        ...config,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000
    });

    try {
        console.log('Verifying connection...');
        await transporter.verify();
        console.log(`✅ SUCCESS: ${name} connected!`);
        return true;
    } catch (error) {
        console.error(`❌ FAILED: ${name}`);
        console.error(`Error: ${error.message} (Code: ${error.code})`);
        return false;
    }
}

async function runTests() {
    // 1. Standard Gmail (465)
    await testConfig('Gmail (Standard/465)', {
        service: 'gmail'
    });

    // 2. Gmail with IPv4 Forced
    await testConfig('Gmail (IPv4/465)', {
        service: 'gmail',
        family: 4
    });

    // 3. Gmail Port 587 (StartTLS)
    await testConfig('Gmail (StartTLS/587)', {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false
    });

    // 4. Gmail Port 587 (StartTLS, IPv4)
    await testConfig('Gmail (StartTLS/587, IPv4)', {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        family: 4
    });
}

runTests();
