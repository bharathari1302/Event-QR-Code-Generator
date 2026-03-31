import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { adminId, rollNo, updates } = body;

        if (!adminId || !rollNo || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();

        const student = await Student.findOne({ 
            adminId, 
            rollNo: new RegExp(`^${rollNo}$`, 'i') 
        });

        if (!student) {
            return NextResponse.json({ error: 'Student not found. Please register first.' }, { status: 404 });
        }

        // Apply updates directly
        if (updates['core_email']) student.email = updates['core_email'];
        if (updates['core_photo']) student.photo = updates['core_photo'];

        const currentCustomFields = student.customFields
            ? typeof student.customFields.toJSON === 'function'
                ? student.customFields.toJSON()
                : { ...student.customFields }
            : {};

        for (const [k, v] of Object.entries(updates)) {
            if (!k.startsWith('core_')) {
                currentCustomFields[k] = v;
            }
        }

        student.customFields = currentCustomFields;
        await student.save();

        return NextResponse.json({ success: true, message: 'Profile updated successfully!' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
