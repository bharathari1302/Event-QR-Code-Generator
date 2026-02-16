import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const { rollNo } = await req.json();

        if (!rollNo) {
            return NextResponse.json({ error: 'Roll Number is required' }, { status: 400 });
        }

        const formattedRollNo = rollNo.trim().toUpperCase();

        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef
            .where('rollNo', '==', formattedRollNo)
            .where('role', '==', 'coordinator')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Invalid Roll Number or Access Denied.' }, { status: 401 });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        return NextResponse.json({
            success: true,
            user: {
                rollNo: userData.rollNo,
                department: userData.department,
                role: 'coordinator'
            }
        });

    } catch (error: any) {
        console.error('Coordinator Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
