import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        await connectDB();
        const users = await User.find({ adminId }).lean();
        const formattedUsers = users.map((user: any) => ({
            id: user._id.toString(),
            uid: user._id.toString(),
            ...user,
            createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null
        }));
        return NextResponse.json(formattedUsers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
