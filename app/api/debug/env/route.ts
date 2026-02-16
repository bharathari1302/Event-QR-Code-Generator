import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const pk = process.env.FIREBASE_PRIVATE_KEY;
        const processedPk = pk ? pk.replace(/\\n/g, '\n').replace(/"/g, '') : undefined;

        const envCheck = {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            projectId: process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!pk,
            privateKeyStart: pk ? pk.substring(0, 20) : 'N/A',
            processedPrivateKeyStart: processedPk ? processedPk.substring(0, 20) : 'N/A',
            processedPrivateKeyHasNewlines: processedPk ? processedPk.includes('\n') : false,
        };

        // Try to list users to verify Auth
        let authStatus = 'OK';
        let error = null;
        try {
            await adminAuth.listUsers(1);
        } catch (e: any) {
            authStatus = 'FAILED';
            error = e.code + ': ' + e.message;
        }

        return NextResponse.json({ envCheck, authStatus, error });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
