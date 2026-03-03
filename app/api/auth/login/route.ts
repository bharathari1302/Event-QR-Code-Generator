import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and Password are required' }, { status: 400 });
        }

        await connectDB();

        // 1. Find user by email
        const userDoc = await User.findOne({ email });

        if (!userDoc) {
            return NextResponse.json({ error: 'Invalid Email or Password' }, { status: 401 });
        }

        const userData = userDoc.toObject();

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

        let adminDetails = null;
        let adminId = userData.adminId;

        // An Admin is their own tenant
        if (userData.role === 'admin') {
            adminId = userData.uid || userData._id.toString();
            adminDetails = { name: userData.department || 'Admin', email: userData.email };
        } else if (adminId) {
            const adminDoc = await User.findOne({
                $or: [{ uid: adminId }, { _id: adminId }] // handle both firebase uid or mongo _id
            }).lean() as any;
            if (adminDoc) {
                adminDetails = { name: adminDoc.department || 'Admin', email: adminDoc.email };
            }
        }

        return NextResponse.json({
            success: true,
            user: { ...safeUser, adminId, adminDetails }
        });

    } catch (error: any) {
        console.error('Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
