import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// GET: List coordinators for an event
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        const snapshot = await adminDb.collection('events').doc(eventId).collection('coordinators').get();
        const coordinators = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
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

        if (!eventId || !userId || !rollNo) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await adminDb.collection('events').doc(eventId).collection('coordinators').doc(userId).set({
            rollNo,
            department: department || 'Unknown',
            allowedDepartments: allowedDepartments || ['ALL'], // Default to ALL if not specified
            addedAt: new Date()
        });

        return NextResponse.json({ success: true, message: 'Coordinator added successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update coordinator permissions
export async function PUT(req: NextRequest) {
    try {
        const { eventId, coordinatorId, allowedDepartments } = await req.json();

        if (!eventId || !coordinatorId || !allowedDepartments) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await adminDb.collection('events').doc(eventId).collection('coordinators').doc(coordinatorId).update({
            allowedDepartments: allowedDepartments
        });

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

        if (!eventId || !coordinatorId) {
            return NextResponse.json({ error: 'Missing Event ID or Coordinator ID' }, { status: 400 });
        }

        await adminDb.collection('events').doc(eventId).collection('coordinators').doc(coordinatorId).delete();

        return NextResponse.json({ success: true, message: 'Coordinator removed' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
