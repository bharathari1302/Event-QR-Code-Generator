import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        await connectDB();
        // Since students are "Global", do we filter by adminId?
        // Let's assume global means "global for this admin/tenant"
        const students = await Student.find({ adminId }).sort({ rollNo: 1 }).lean();
        const normalizedStudents = students.map((student: any) => ({
            ...student,
            customFields:
                student.customFields && typeof student.customFields.toJSON === 'function'
                    ? student.customFields.toJSON()
                    : (student.customFields || {})
        }));
        
        return NextResponse.json({ success: true, students: normalizedStudents });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        const body = await req.json();
        await connectDB();

        // Handle Bulk Upload
        if (Array.isArray(body)) {
            // Upsert all students based on rollNo and adminId
            const operations = body.map(student => {
                const docToUpdate = { ...student, adminId };
                return {
                    updateOne: {
                        filter: { rollNo: student.rollNo, adminId },
                        update: { $set: docToUpdate },
                        upsert: true
                    }
                };
            });
            
            const result = await Student.bulkWrite(operations);
            return NextResponse.json({ 
                success: true, 
                message: `Processed ${body.length} students. Updated or inserted successfully.`
            });
        }

        // Handle Single Upload
        const { _id, rollNo, name, email, photo, customFields } = body;
        
        if (!rollNo || !name) {
            return NextResponse.json({ error: 'Roll No and Name are required' }, { status: 400 });
        }

        let student;
        if (_id) {
            // Edit existing student by ID (allows rollNo to be changed safely)
            student = await Student.findOneAndUpdate(
                { _id, adminId },
                { rollNo, name, email, photo, customFields: customFields || {} },
                { new: true }
            );
            if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        } else {
            // Create or Upsert by Roll No
            student = await Student.findOneAndUpdate(
                { rollNo, adminId },
                { rollNo, name, email, photo, customFields: customFields || {}, adminId },
                { new: true, upsert: true }
            );
        }

        return NextResponse.json({ success: true, student });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
