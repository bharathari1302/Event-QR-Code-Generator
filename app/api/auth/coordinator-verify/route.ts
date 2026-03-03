import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Coordinator from '@/models/Coordinator';
import Event from '@/models/Event';

export async function POST(req: NextRequest) {
    try {
        const { rollNo, otp } = await req.json();

        if (!rollNo || !otp) {
            return NextResponse.json({ error: 'Roll Number and OTP are required' }, { status: 400 });
        }

        const formattedRollNo = rollNo.trim().toUpperCase();

        await connectDB();

        const userDoc = await User.findOne({
            rollNo: formattedRollNo,
            role: 'coordinator'
        });

        if (!userDoc) {
            console.log('[VerifyOTP] User not found for rollNo:', formattedRollNo);
            return NextResponse.json({ error: 'Invalid Roll Number or Access Denied.' }, { status: 401 });
        }

        console.log(`[VerifyOTP] Submitted OTP: "${otp}", DB OTP: "${userDoc.otp}"`);

        // Verify OTP
        if (!userDoc.otp || String(userDoc.otp).trim() !== String(otp).trim()) {
            console.log('[VerifyOTP] Mismatch!');
            return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
        }

        // Check Expiry
        console.log(`[VerifyOTP] Current Time: ${new Date()}, Expiry: ${userDoc.otpExpiry}`);
        if (userDoc.otpExpiry && new Date() > new Date(userDoc.otpExpiry)) {
            console.log('[VerifyOTP] Expired!');
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // OTP is valid. Clear it to prevent reuse.
        userDoc.otp = undefined;
        userDoc.otpExpiry = undefined;
        await userDoc.save();

        const userData = userDoc.toObject();

        // Fetch Event details for the coordinator
        const coordinatorDoc = await Coordinator.findOne({ rollNo: formattedRollNo }).lean() as any;
        let eventId = null;
        let eventMeals: string[] = [];

        if (coordinatorDoc && coordinatorDoc.eventId) {
            eventId = coordinatorDoc.eventId;
            const eventDoc = await Event.findById(eventId).lean() as any;
            if (eventDoc && eventDoc.options && eventDoc.options.length > 0) {
                eventMeals = eventDoc.options;
            } else {
                // If the event hasn't explicitly configured meals, provide standard defaults
                eventMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
            }
        } else {
            // Fallback if somehow no Event is linked (rare, but good for safety)
            eventMeals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
        }

        let adminDetails = null;
        let adminId = userData.adminId;

        if (adminId) {
            const adminDoc = await User.findOne({
                $or: [{ uid: adminId }, { _id: adminId }]
            }).lean() as any;
            if (adminDoc) {
                adminDetails = { name: adminDoc.department || 'Admin', email: adminDoc.email };
            }
        }

        return NextResponse.json({
            success: true,
            user: {
                rollNo: userData.rollNo,
                department: userData.department,
                role: 'coordinator',
                eventId: eventId,
                eventMeals: eventMeals,
                adminId: adminId,
                adminDetails: adminDetails
            }
        });

    } catch (error: any) {
        console.error('Coordinator Verify API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
