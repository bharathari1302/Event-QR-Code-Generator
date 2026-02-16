import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rollNo = searchParams.get('rollNo');

        if (!rollNo) {
            return NextResponse.json({ error: 'Roll No is required' }, { status: 400 });
        }

        const snapshot = await adminDb.collection('users')
            .where('role', '==', 'coordinator')
            .where('rollNo', '==', rollNo.toUpperCase())
            .get();

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            return NextResponse.json({
                found: true,
                source: 'user',
                id: userDoc.id,
                rollNo: userData.rollNo,
                department: userData.department
            });
        }

        // 2. Fallback: Search in Participants Collection (from Google Sheet)
        const participantSnapshot = await adminDb.collection('participants')
            .where('rollNo', '==', rollNo.toUpperCase())
            .limit(1)
            .get();

        if (!participantSnapshot.empty) {
            const pDoc = participantSnapshot.docs[0];
            const pData = pDoc.data();
            return NextResponse.json({
                found: true,
                source: 'participant',
                name: pData.name,
                rollNo: pData.rollNo,
                department: pData.department
            });
        }

        return NextResponse.json({ error: 'Coordinator not found in Users or Sheet' }, { status: 404 });

    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
