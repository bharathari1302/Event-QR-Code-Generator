import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const meal = searchParams.get('meal'); // breakfast, lunch, etc.

        if (!eventId || !meal) {
            return NextResponse.json({ error: 'Event ID and Meal Type required' }, { status: 400 });
        }

        console.log(`FETCHING DETAILS: eventId=${eventId}, meal=${meal}`);

        await connectDB();

        // Query ALL participants for the event (removed meal filter)
        const docs = await Participant.find({ event_id: eventId }).lean() as any[];

        console.log(`FETCH DETAILS: Found ${docs.length} participants for event ${eventId}`);

        const participants = docs.map((data: any) => {
            const isServed = data.tokenUsage?.[meal] === true;

            // Format timestamp if it exists. Since check_ins is a Date property in schema or root property depending on how we saved it earlier. 
            // Our verify route saves it as check_ins[meal] = new Date().
            let checkInTime = data.check_ins?.[meal] || data[`check_in_${meal}`];
            let formattedTime = '-';
            if (isServed) {
                if (checkInTime instanceof Date) {
                    formattedTime = checkInTime.toLocaleString();
                } else if (checkInTime) {
                    formattedTime = new Date(checkInTime).toLocaleString();
                } else {
                    formattedTime = 'Verified';
                }
            }

            return {
                id: data._id.toString(),
                name: data.name,
                rollNo: data.rollNo || 'N/A',
                roomNo: data.roomNo || 'N/A',
                foodPreference: data.foodPreference || 'Not Specified',
                status: isServed ? 'Served' : 'Pending',
                timestamp: formattedTime
            };
        });

        console.log(`FETCH DETAILS: Mapped ${participants.length} participants.`);

        // Sort: Served first, then by name
        participants.sort((a, b) => {
            if (a.status === b.status) {
                return a.name.localeCompare(b.name);
            }
            return a.status === 'Served' ? -1 : 1;
        });

        return NextResponse.json({ participants });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
