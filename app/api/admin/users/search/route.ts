import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rollNo = searchParams.get('rollNo');
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!rollNo) {
            return NextResponse.json({ error: 'Roll No is required' }, { status: 400 });
        }

        await connectDB();

        const userDoc = await User.findOne({
            role: 'coordinator',
            rollNo: rollNo.toUpperCase(),
            adminId
        });

        if (userDoc) {
            return NextResponse.json({
                found: true,
                source: 'user',
                id: userDoc._id.toString(),
                rollNo: userDoc.rollNo,
                department: userDoc.department
            });
        }

        // 2. Fallback: Search in Participants Collection (from Google Sheet)
        const pDoc = await Participant.findOne({
            rollNo: rollNo.toUpperCase()
        });

        if (pDoc) {
            return NextResponse.json({
                found: true,
                source: 'participant',
                name: pDoc.name,
                rollNo: pDoc.rollNo,
                department: pDoc.department
            });
        }

        return NextResponse.json({ error: 'Coordinator not found in Users or Sheet' }, { status: 404 });

    } catch (error: any) {
        console.error('Error searching user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
