import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        await connectDB();

        // Ensure the deleted user actually belongs to this adminId
        const user = await User.findOne({ _id: userId, adminId });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Prevent deleting admin accounts for safety
        if (user.role === 'admin') {
            return NextResponse.json({ error: 'Cannot delete admin accounts.' }, { status: 403 });
        }

        await User.findByIdAndDelete(userId);

        return NextResponse.json({ success: true, message: 'User deleted successfully.' });

    } catch (error: any) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
