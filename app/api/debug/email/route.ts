import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const host = process.env.EMAIL_HOST;

    const results: any = {
        config: {
            EMAIL_USER: user ? `${user.substring(0, 3)}****${user.split('@')[1] || ''}` : 'MISSING',
            EMAIL_PASS_SET: pass ? 'YES (Length: ' + pass.length + ')' : 'NO',
            EMAIL_HOST: host || 'gmail (default)',
        },
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    };

    try {
        const transporter = nodemailer.createTransport({
            ...(host ? {
                host: host,
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true',
            } : {
                service: 'gmail',
            }),
            auth: {
                user: user,
                pass: pass,
            },
            tls: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: false,
            },
        });

        await transporter.verify();
        results.connection = 'SUCCESS: Server is ready to take our messages';
    } catch (error: any) {
        results.connection = 'FAILED';
        results.error = error.message || error.toString();
        results.code = error.code;
    }

    return NextResponse.json(results);
}
