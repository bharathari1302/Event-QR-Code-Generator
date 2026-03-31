import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        const { adminId, rollNo, name, email, photo, customFields } = body;

        if (!adminId || !rollNo || !name) {
            return NextResponse.json({ error: 'Admin ID, Roll No, and Name are required.' }, { status: 400 });
        }

        await connectDB();

        // Upsert student globally tied to this admin tenant
        const student = await Student.findOneAndUpdate(
            { rollNo: new RegExp(`^${rollNo}$`, 'i'), adminId },
            { 
                rollNo: rollNo.toUpperCase(), 
                name, 
                email, 
                photo, 
                customFields: customFields || {}, 
                adminId 
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, message: 'Student registered to the global directory!' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
