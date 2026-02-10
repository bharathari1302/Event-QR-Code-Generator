import nodemailer from 'nodemailer';
import fs from 'fs';

const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use 'host' and 'port' for generic SMTP
    pool: true, // Enable connection pooling
    maxConnections: 5, // Max parallel connections
    maxMessages: 100, // Max messages per connection
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
            from: `"Event Team" <${process.env.EMAIL_USER}>`,
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
