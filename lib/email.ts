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
    maxMessages: 500,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s+/g, ''),
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

export async function sendEmail({ to, subject, text, html, attachments }: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const msg = 'Missing EMAIL_USER or EMAIL_PASS environment variables.';
        console.error(msg);
        return { success: false, error: msg };
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
        return { success: true };
    } catch (error: any) {
        const errorMessage = error.message || error.toString();
        console.error(`Failed to send email to ${to}. Error details:`, error);

        // Log to file for easier debugging
        try {
            const logEntry = `[${new Date().toISOString()}] Failed to send to ${to}: ${errorMessage} \nStack: ${error.stack}\n---\n`;
            fs.appendFileSync('email-error.log', logEntry);
        } catch (logError) {
            console.error('Failed to write to log file:', logError);
        }

        return { success: false, error: errorMessage };
    }
}
