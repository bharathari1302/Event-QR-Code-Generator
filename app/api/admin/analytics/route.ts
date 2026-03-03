import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import MessLog from '@/models/MessLog';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const adminId = req.headers.get('x-admin-id');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        // 1. Fetch all 'daily' events and 'special' events for this admin
        const adminEvents = await Event.find({ adminId }).lean();

        const dailyEventIds = adminEvents.filter(e => e.eventType === 'daily').map(e => e._id.toString());
        const specialEventIds = adminEvents.filter(e => e.eventType === 'special').map(e => e._id.toString());

        // 2. Aggregate MessLog data (Last 7 Days) for Daily Meals
        // We'll manually group them by date and mealType to map to Recharts format:
        // { date: '2026-03-01', Breakfast: 120, Lunch: 150, Dinner: 110 }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateStringLimit = sevenDaysAgo.toISOString().split('T')[0];

        const recentMessLogs = await MessLog.find({
            event_id: { $in: dailyEventIds },
            date: { $gte: dateStringLimit }
        }).lean();

        const dailyTrendsMap: Record<string, any> = {};
        recentMessLogs.forEach((log) => {
            const dateStr = log.date;
            if (!dailyTrendsMap[dateStr]) {
                dailyTrendsMap[dateStr] = { date: dateStr, Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0 };
            }
            if (log.mealType === 'Breakfast') dailyTrendsMap[dateStr].Breakfast += 1;
            if (log.mealType === 'Lunch') dailyTrendsMap[dateStr].Lunch += 1;
            if (log.mealType === 'Snacks') dailyTrendsMap[dateStr].Snacks += 1;
            if (log.mealType === 'Dinner') dailyTrendsMap[dateStr].Dinner += 1;
        });

        // Sort trends by date ascending
        const dailyTrends = Object.values(dailyTrendsMap).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Aggregate Special Events Food Preference (Veg vs Non-Veg)
        const participants = await Participant.find({
            event_id: { $in: specialEventIds }
        }).select('foodPreference').lean();

        let vegCount = 0;
        let nonVegCount = 0;

        participants.forEach(p => {
            // Note: Normalizing text. We default to Veg if undefined.
            const pref = p.foodPreference?.toLowerCase() || 'veg';
            if (pref.includes('non')) {
                nonVegCount++;
            } else {
                vegCount++;
            }
        });

        const foodPreferenceData = [
            { name: 'Veg', value: vegCount, color: '#22c55e' }, // green-500
            { name: 'Non-Veg', value: nonVegCount, color: '#ef4444' } // red-500
        ];

        // 4. Aggregate Peak Scanning Times
        // We look at all scans (completed participants or mess logs) and group by Hour
        const peakTimesMap: Record<string, number> = {};

        // Parse special event scans
        participants.forEach(p => {
            if (p.scannedAt) {
                const hour = new Date(p.scannedAt).getHours();
                const hourKey = `${hour}:00`;
                peakTimesMap[hourKey] = (peakTimesMap[hourKey] || 0) + 1;
            }
        });

        // Parse daily meal scans
        recentMessLogs.forEach(log => {
            if (log.scannedAt) {
                const hour = new Date(log.scannedAt).getHours();
                const hourKey = `${hour}:00`;
                peakTimesMap[hourKey] = (peakTimesMap[hourKey] || 0) + 1;
            }
        });

        const peakScanningTimes = Object.keys(peakTimesMap).map(hour => ({
            time: hour,
            scans: peakTimesMap[hour]
        })).sort((a, b) => parseInt(a.time) - parseInt(b.time));

        // 5. Aggregate Event Attendance Rate (Special Events only)
        let totalTokens = participants.length;
        let redeemedTokens = participants.filter(p => p.tokenUsage === true).length;
        let unredeemedTokens = totalTokens - redeemedTokens;

        const attendanceRate = totalTokens > 0 ? [
            { name: 'Redeemed', value: redeemedTokens, color: '#3b82f6' }, // blue-500
            { name: 'Unredeemed', value: unredeemedTokens, color: '#94a3b8' } // slate-400
        ] : [];


        // 6. Return the aggregated data payload
        return NextResponse.json({
            success: true,
            data: {
                dailyTrends,
                foodPreference: foodPreferenceData,
                peakScanningTimes,
                attendanceRate,
                summary: {
                    totalSpecialEvents: specialEventIds.length,
                    totalDailyMeals: dailyEventIds.length,
                    totalParticipants: participants.length
                }
            }
        });

    } catch (error: any) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
