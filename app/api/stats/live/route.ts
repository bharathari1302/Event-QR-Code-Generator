import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        await connectDB();

        const pipeline = [
            { $match: { event_id: eventId } },
            {
                $project: {
                    tokenUsage: 1,
                    isVeg: {
                        $and: [
                            { $regexMatch: { input: { $toLower: { $ifNull: ["$foodPreference", ""] } }, regex: /veg/ } },
                            { $not: { $regexMatch: { input: { $toLower: { $ifNull: ["$foodPreference", ""] } }, regex: /non/ } } }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total_breakfast: { $sum: { $cond: [{ $eq: ["$tokenUsage.breakfast", true] }, 1, 0] } },
                    veg_breakfast: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.breakfast", true] }, "$isVeg"] }, 1, 0] } },
                    nonveg_breakfast: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.breakfast", true] }, { $not: ["$isVeg"] }] }, 1, 0] } },

                    total_lunch: { $sum: { $cond: [{ $eq: ["$tokenUsage.lunch", true] }, 1, 0] } },
                    veg_lunch: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.lunch", true] }, "$isVeg"] }, 1, 0] } },
                    nonveg_lunch: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.lunch", true] }, { $not: ["$isVeg"] }] }, 1, 0] } },

                    total_snacks: { $sum: { $cond: [{ $eq: ["$tokenUsage.snacks", true] }, 1, 0] } },
                    veg_snacks: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.snacks", true] }, "$isVeg"] }, 1, 0] } },
                    nonveg_snacks: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.snacks", true] }, { $not: ["$isVeg"] }] }, 1, 0] } },

                    total_dinner: { $sum: { $cond: [{ $eq: ["$tokenUsage.dinner", true] }, 1, 0] } },
                    veg_dinner: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.dinner", true] }, "$isVeg"] }, 1, 0] } },
                    nonveg_dinner: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.dinner", true] }, { $not: ["$isVeg"] }] }, 1, 0] } },

                    total_icecream: { $sum: { $cond: [{ $eq: ["$tokenUsage.icecream", true] }, 1, 0] } },
                    veg_icecream: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.icecream", true] }, "$isVeg"] }, 1, 0] } },
                    nonveg_icecream: { $sum: { $cond: [{ $and: [{ $eq: ["$tokenUsage.icecream", true] }, { $not: ["$isVeg"] }] }, 1, 0] } }
                }
            }
        ];

        const aggResult = await Participant.aggregate(pipeline);

        let stats: Record<string, number> = {};
        if (aggResult.length > 0) {
            const row = aggResult[0];
            delete row._id;
            stats = row;
        } else {
            // fallback if no participants exist, initialize to 0
            const meals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];
            for (const meal of meals) {
                stats[`total_${meal}`] = 0;
                stats[`veg_${meal}`] = 0;
                stats[`nonveg_${meal}`] = 0;
            }
        }

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error('Stats aggregation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
