import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Participant from '@/models/Participant';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { email, password, role, department, rollNo } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        // Basic Validation
        if (!role || !['admin', 'manager', 'coordinator', 'warden'].includes(role)) {
            return NextResponse.json({ error: 'Invalid User Role' }, { status: 400 });
        }

        await connectDB();

        if (role === 'coordinator') {
            if (!rollNo || !department) {
                return NextResponse.json({ error: 'Coordinator requires Roll No and Department' }, { status: 400 });
            }

            // Check if user already exists
            const existing = await User.findOne({ rollNo: rollNo.toUpperCase() });
            if (existing) {
                return NextResponse.json({ error: 'User with this Roll No already exists.' }, { status: 400 });
            }

            // Attempt to grab email from Participant record
            const participant = await Participant.findOne({ rollNo: rollNo.toUpperCase() });
            const userEmail = participant?.email || email; // fallback to body.email or undefined

            // Create Coordinator
            const newUser = new User({
                rollNo: rollNo.toUpperCase(),
                role: 'coordinator',
                department: department,
                email: userEmail,
                adminId: adminId
            });
            await newUser.save();

            return NextResponse.json({ success: true, message: 'Coordinator created successfully.' });

        } else {
            // Admin or Manager
            if (!email || !password) {
                return NextResponse.json({ error: 'Email and Password are required.' }, { status: 400 });
            }

            // Check if user already exists in DB
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
            }

            // Hash Password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                email: email,
                passwordHash: hashedPassword,
                role: role,
                department: department || 'IT',
                adminId: adminId
            });
            await newUser.save();

            // Store uid explicitly if frontend relies on it
            newUser.uid = newUser._id.toString();
            await newUser.save();

            return NextResponse.json({ success: true, message: `${role} account created successfully.` });
        }

    } catch (error: any) {
        console.error("Create User Error Full:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        const returnError = error.code ? `${error.code}: ${error.message}` : error.message;
        return NextResponse.json({ error: returnError || 'Internal Server Error' }, { status: 500 });
    }
}
