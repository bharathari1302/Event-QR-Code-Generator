import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Coordinator from '@/models/Coordinator';

// GET: List coordinators for an event
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        await connectDB();
        const docs = await Coordinator.find({ eventId, adminId }).lean();
        const coordinators = docs.map((doc: any) => ({
            id: doc._id.toString(),
            ...doc
        }));

        return NextResponse.json(coordinators);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Add a coordinator to an event
export async function POST(req: NextRequest) {
    try {
        const { eventId, userId, rollNo, department, allowedDepartments } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId || !userId || !rollNo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();

        // Use findOneAndUpdate with upsert to mimic Firebase's set() on a specific ID
        // The ID in firebase was the `userId`. We map `userId` explicitly now.
        const coord = await Coordinator.findOneAndUpdate(
            { eventId, userId, adminId },
            {
                rollNo,
                department: department || 'Unknown',
                allowedDepartments: allowedDepartments || ['ALL'],
                adminId // Ensure adminId is set on insert
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true, message: 'Coordinator added successfully', id: coord._id.toString() });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update coordinator permissions
export async function PUT(req: NextRequest) {
    try {
        const { eventId, coordinatorId, allowedDepartments } = await req.json();
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId || !coordinatorId || !allowedDepartments) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();

        const updated = await Coordinator.findOneAndUpdate(
            { _id: coordinatorId, adminId },
            { allowedDepartments },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Coordinator not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Permissions updated' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove coordinator from event
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const coordinatorId = searchParams.get('coordinatorId');
        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId || !coordinatorId) {
            return NextResponse.json({ error: 'Missing Event ID or Coordinator ID' }, { status: 400 });
        }

        await connectDB();
        const deleted = await Coordinator.findOneAndDelete({ _id: coordinatorId, adminId });

        if (!deleted) {
            return NextResponse.json({ error: 'Coordinator not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Coordinator removed' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
