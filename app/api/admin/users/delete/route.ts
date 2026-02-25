import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const userData = userDoc.data();

        // Prevent deleting admin accounts for safety
        if (userData?.role === 'admin') {
            return NextResponse.json({ error: 'Cannot delete admin accounts.' }, { status: 403 });
        }

        await userRef.delete();

        return NextResponse.json({ success: true, message: 'User deleted successfully.' });

    } catch (error: any) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
