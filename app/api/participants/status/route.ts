import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const mealType = searchParams.get('mealType') || 'all'; // breakfast, lunch, dinner, snacks, icecream, all

        if (!eventId) {
            return NextResponse.json({ success: false, message: 'Event ID required' }, { status: 400 });
        }

        // Fetch all participants for this event
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.where('event_id', '==', eventId).get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                served: [],
                notServed: [],
                counts: { served: 0, notServed: 0 }
            });
        }

        const served: any[] = [];
        const notServed: any[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tokenUsage = data.tokenUsage || {};

            let hasUsedMeal = false;

            if (mealType === 'all') {
                // Check if ANY meal has been used
                hasUsedMeal = tokenUsage.breakfast || tokenUsage.lunch || tokenUsage.dinner ||
                    tokenUsage.snacks || tokenUsage.icecream;
            } else {
                // Check specific meal type
                hasUsedMeal = tokenUsage[mealType] === true;
            }

            const participant = {
                id: doc.id,
                name: data.name || 'N/A',
                rollNo: data.rollNo || 'N/A',
                roomNo: data.other_details?.['Room No'] || data.roomNo || 'N/A',
                department: data.other_details?.['Department - ALL CAPS'] || 'N/A',
                foodPreference: data.foodPreference || data.other_details?.['Food Preference'] || 'N/A',
                ticket_id: data.ticket_id || 'N/A',
                tokenUsage: tokenUsage,
                usedAt: tokenUsage[`${mealType}At`] || null
            };

            if (hasUsedMeal) {
                served.push(participant);
            } else {
                notServed.push(participant);
            }
        });

        // Sort by name
        served.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        notServed.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return NextResponse.json({
            success: true,
            served,
            notServed,
            counts: {
                served: served.length,
                notServed: notServed.length,
                total: served.length + notServed.length
            },
            mealType
        });

    } catch (error: any) {
        console.error('Error fetching student status:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch student status'
        }, { status: 500 });
    }
}
