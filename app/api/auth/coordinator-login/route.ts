import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Participant from '@/models/Participant';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const { rollNo } = await req.json();

        if (!rollNo) {
            return NextResponse.json({ error: 'Roll Number is required' }, { status: 400 });
        }

        const formattedRollNo = rollNo.trim().toUpperCase();

        await connectDB();

        const userDoc = await User.findOne({
            rollNo: formattedRollNo,
            role: 'coordinator'
        });

        if (!userDoc) {
            return NextResponse.json({ error: 'Invalid Roll Number or Access Denied.' }, { status: 401 });
        }

        let userEmail = userDoc.email;

        // Fallback: If no email in User model, try to fetch from Participant model
        if (!userEmail) {
            const participant = await Participant.findOne({ rollNo: formattedRollNo }).lean() as any;
            if (participant && participant.email) {
                userEmail = participant.email;
                userDoc.email = userEmail;
            }
        }

        if (!userEmail) {
            return NextResponse.json({ error: 'No email registered for this Roll Number. Cannot send OTP. Please ask admin to assign your email.' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Expiry time: 2 minutes from now
        const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

        // Save OTP (using findOneAndUpdate to bypass Mongoose tracking issues)
        await User.findOneAndUpdate(
            { _id: userDoc._id },
            {
                $set: {
                    otp: otp,
                    otpExpiry: otpExpiry,
                    email: userEmail
                }
            },
            { new: true }
        );

        // Send Email
        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #7c3aed; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Q-Swift Scanner Access</h2>
                </div>
                <div style="padding: 30px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #333;">Hello Coordinator,</p>
                    <p style="font-size: 16px; color: #333;">Please use the following OTP to log in to the Q-Swift Food Scanner app:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed; padding: 10px 20px; background-color: #f3f4f6; border-radius: 8px;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #666; text-align: center;">This OTP is valid for 2 minutes.</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: userEmail,
            subject: 'Your Q-Swift Coordinator OTP',
            html: emailHTML
        });

        return NextResponse.json({
            success: true,
            requiresOtp: true,
            message: 'OTP sent to your registered email.'
        });

    } catch (error: any) {
        console.error('Coordinator Login API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
