import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Student from '@/models/Student';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        // Run aggregation queries in parallel, scoped to adminId where applicable
        const [totalEvents, totalStudents, totalUsers] = await Promise.all([
            Event.countDocuments({ adminId }),
            Student.countDocuments({ adminId }),
            User.countDocuments({ adminId })
        ]);

        return NextResponse.json({
            totalEvents,
            totalStudents,
            totalUsers
        });

    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
