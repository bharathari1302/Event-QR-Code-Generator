import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Run aggregation queries in parallel
        const [eventsSnap, participantsSnap, usersSnap] = await Promise.all([
            adminDb.collection('events').select('name').get(), // Optimize by selecting one field if count() isn't standard in older SDKs, or just use .get() for consistency
            adminDb.collection('participants').select('name').get(),
            adminDb.collection('users').select('email').get()
        ]);

        // Calculate counts (using .size is reliable for small-medium datasets)
        const totalEvents = eventsSnap.size;
        const totalParticipants = participantsSnap.size;
        const totalUsers = usersSnap.size;

        return NextResponse.json({
            totalEvents,
            totalParticipants,
            totalUsers
        });

    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
