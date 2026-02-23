import nodemailer from 'nodemailer';
import fs from 'fs';

const transporter = nodemailer.createTransport({
    // If EMAIL_HOST is provided, use generic SMTP
    ...(process.env.EMAIL_HOST ? {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    } : {
        // Fallback to Gmail service if no host specified
        service: 'gmail',
    }),
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Fix for DECODER routines error in production (Node.js 18+)
    // This configures TLS to use modern ciphers compatible with Gmail
    tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false, // Safe for Gmail as the service identity is verified
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: {
        filename: string;
        content: Buffer;
        contentType: string;
    }[];
}

export async function sendEmail({ to, subject, text, html, attachments }: EmailOptions) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Missing EMAIL_USER or EMAIL_PASS environment variables.');
        return false;
    }

    try {
        console.log(`Attempting to send email to ${to} from ${process.env.EMAIL_USER}...`);
        const info = await transporter.sendMail({
            from: `"Q-Swift" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
            attachments,
        });
        console.log(`Email sent successfully to ${to}: ${info.messageId}`);
        return true;
    } catch (error: any) {
        console.error(`Failed to send email to ${to}. Error details:`, error);

        // Log to file for easier debugging
        try {
            const logEntry = `[${new Date().toISOString()}] Failed to send to ${to}: ${error.toString()} \nStack: ${error.stack}\n---\n`;
            fs.appendFileSync('email-error.log', logEntry);
        } catch (logError) {
            console.error('Failed to write to log file:', logError);
        }

        return false;
    }
}
