import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest) {
    try {
        const { userId, email, password } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const updates: Record<string, any> = {};

        if (email) {
            // Check for duplicates
            const existing = await adminDb.collection('users')
                .where('email', '==', email)
                .get();
            const duplicate = existing.docs.find(d => d.id !== userId);
            if (duplicate) {
                return NextResponse.json({ error: 'Email already in use by another account.' }, { status: 400 });
            }
            updates.email = email;
        }

        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
            }
            const salt = await bcrypt.genSalt(10);
            updates.passwordHash = await bcrypt.hash(password, salt);
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
        }

        await userRef.update(updates);

        return NextResponse.json({ success: true, message: 'Manager updated successfully.' });

    } catch (error: any) {
        console.error('Update User Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
