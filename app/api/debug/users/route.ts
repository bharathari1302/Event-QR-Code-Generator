import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
    try {
        const snapshot = await adminDb.collection('users').get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            role: doc.data().role,
            hasHash: !!doc.data().passwordHash
        }));
        return NextResponse.json({ users });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to list users',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
