import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Participant from '@/models/Participant';
import Student from '@/models/Student';

function extractRoomNo(customFields: Record<string, any>) {
    return (
        customFields.roomNo ||
        customFields.room_no ||
        customFields.room ||
        customFields.core_roomNo ||
        customFields['Room No'] ||
        customFields['room no'] ||
        'N/A'
    );
}

function extractFoodPreference(customFields: Record<string, any>) {
    return (
        customFields.foodPreference ||
        customFields.food_pref ||
        customFields.food ||
        customFields['Food Preference'] ||
        customFields['food preference'] ||
        'Not Specified'
    );
}

export async function GET(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');
        const meal = searchParams.get('meal');

        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        if (!eventId || !meal) {
            return NextResponse.json({ error: 'Event ID and meal are required' }, { status: 400 });
        }

        await connectDB();

        const [students, eventParticipants] = await Promise.all([
            Student.find({ adminId }).sort({ rollNo: 1 }).lean() as any,
            Participant.find({ event_id: eventId }).lean() as any,
        ]);

        const participantByRoll = new Map<string, any>();
        for (const participant of eventParticipants) {
            const roll = String(participant.rollNo || '').trim().toUpperCase();
            if (roll) {
                participantByRoll.set(roll, participant);
            }
        }

        const mergedStudents = students.map((student: any) => {
            const studentRoll = String(student.rollNo || '').trim().toUpperCase();
            const participant = participantByRoll.get(studentRoll);
            const customFields =
                student.customFields && typeof student.customFields.toJSON === 'function'
                    ? student.customFields.toJSON()
                    : (student.customFields || {});

            const isServed = participant?.tokenUsage?.[meal] === true;

            const checkInTime = participant?.check_ins?.[meal] || participant?.[`check_in_${meal}`];
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
                id: String(student._id),
                name: student.name || participant?.name || 'N/A',
                rollNo: student.rollNo || participant?.rollNo || 'N/A',
                roomNo: participant?.roomNo || extractRoomNo(customFields),
                foodPreference: participant?.foodPreference || extractFoodPreference(customFields),
                status: isServed ? 'Served' : 'Pending',
                timestamp: formattedTime,
            };
        });

        mergedStudents.sort((a: any, b: any) => {
            if (a.status === b.status) return String(a.name).localeCompare(String(b.name));
            return a.status === 'Served' ? -1 : 1;
        });

        return NextResponse.json({
            success: true,
            students: mergedStudents,
            totalStudents: mergedStudents.length,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
