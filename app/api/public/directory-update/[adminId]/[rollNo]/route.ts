import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';
import StudentFormConfig from '@/models/StudentFormConfig';

export async function GET(req: NextRequest, { params }: { params: Promise<{ adminId: string, rollNo: string }> }) {
    try {
        const { adminId, rollNo } = await params;
        await connectDB();
        const student = await Student.findOne({ 
            adminId, 
            rollNo: new RegExp(`^${rollNo}$`, 'i') 
        }).lean();

        if (!student) {
            return NextResponse.json({ success: false, error: 'Roll No not found. Please register as a new student first.' }, { status: 404 });
        }

        // Fetch the master form config
        const config = await StudentFormConfig.findOne({ adminId }).lean();
        if (!config || !config.formFields) {
            return NextResponse.json({ success: false, error: 'Form configuration not found' }, { status: 404 });
        }

        // Determine missing fields
        const normalizedCustomFields = student.customFields && typeof (student.customFields as any).toJSON === 'function'
            ? (student.customFields as any).toJSON()
            : (student.customFields || {});

        const missingFields = config.formFields.filter((field: any) => {
            if (field.id === 'core_rollNo' || field.id === 'core_name') return false; // Never missing, required to exist
            if (field.id === 'core_email') return !student.email || student.email.trim() === '';
            if (field.id === 'core_photo') return !student.photo || student.photo.trim() === '';
            
            const customVal = (normalizedCustomFields as any)[field.id];
            return customVal === null || customVal === undefined || customVal === '' || (Array.isArray(customVal) && customVal.length === 0);
        });

        return NextResponse.json({ 
            success: true, 
            student: { name: student.name, rollNo: student.rollNo }, // Safe info to confirm identity
            missingFields 
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
