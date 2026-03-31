import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Student from '@/models/Student';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        await connectDB();
        
        const deletedStudent = await Student.findOneAndDelete({ _id: id, adminId });

        if (!deletedStudent) {
            return NextResponse.json({ error: 'Student not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Student deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
