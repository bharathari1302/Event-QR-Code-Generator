
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const snapshot = await adminDb.collection('participants')
            .orderBy('created_at', 'desc')
            .limit(5).get();

        const participants = snapshot.docs.map(doc => doc.data());

        return NextResponse.json({ participants });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
