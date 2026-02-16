import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
        }

        // 1. Find user by email
        const usersRef = adminDb.collection('users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json({ error: 'Invalid Email or Password' }, { status: 401 });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // 2. Verify Password
        if (!userData.passwordHash) {
            // Fallback for old accounts or external auth accounts if any
            return NextResponse.json({ error: 'Invalid Auth Method. Please reset password.' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, userData.passwordHash);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Email or Password' }, { status: 401 });
        }

        // 3. Return User Info (exclude password)
        const { passwordHash, ...safeUser } = userData;

        return NextResponse.json({
            success: true,
            user: safeUser
        });

    } catch (error: any) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
