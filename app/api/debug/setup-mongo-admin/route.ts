import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Available only in development' }, { status: 403 });
    }

    try {
        await connectDB();

        // Define initial admin
        const adminEmail = 'admin@example.com';
        const password = 'password123';

        let existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            return NextResponse.json({ message: 'Admin already exists', email: adminEmail });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const admin = new User({
            username: adminEmail,
            email: adminEmail,
            passwordHash,
            role: 'admin',
        });

        await admin.save();

        return NextResponse.json({ message: 'Admin created', email: adminEmail, password });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
