import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest) {
    try {
        const { userId, email, password } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
        }

        await connectDB();

        // Ensure the updated user actually belongs to this adminId
        const user = await User.findOne({ _id: userId, adminId });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        const updates: Record<string, any> = {};

        if (email) {
            // Check for duplicates
            const duplicate = await User.findOne({ email });
            if (duplicate && duplicate._id.toString() !== userId) {
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

        await User.findByIdAndUpdate(userId, updates);

        return NextResponse.json({ success: true, message: 'Manager updated successfully.' });

    } catch (error: any) {
        console.error('Update User Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
