import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // Dynamically calculate stats from actual participant data
        // This ensures stats are always accurate, even if participants are deleted
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef
            .where('event_id', '==', eventId)
            .get();

        const meals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
        const stats: { [key: string]: number } = {};

        // Initialize all counters to 0
        for (const meal of meals) {
            stats[`total_${meal}`] = 0;
            stats[`veg_${meal}`] = 0;
            stats[`nonveg_${meal}`] = 0;
        }

        // Count from actual participant data
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tokenUsage = data.tokenUsage || {};
            const isVeg = data.foodPreference?.toLowerCase().includes('veg') &&
                !data.foodPreference?.toLowerCase().includes('non');

            for (const meal of meals) {
                if (tokenUsage[meal] === true) {
                    stats[`total_${meal}`]++;
                    if (isVeg) {
                        stats[`veg_${meal}`]++;
                    } else {
                        stats[`nonveg_${meal}`]++;
                    }
                }
            }
        });

        return NextResponse.json({ stats });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
