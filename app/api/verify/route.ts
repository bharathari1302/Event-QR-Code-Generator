import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { getPhotoUrlByRollNo } from '@/lib/googleDriveHelper';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ valid: false, message: 'No token provided' }, { status: 400 });
        }

        // Query for the token
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.where('token', '==', token).limit(1).get();

        if (snapshot.empty) {
            return NextResponse.json({ valid: false, status: 'invalid', message: 'Invalid Invitation' });
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Fetch photo URL from Google Drive based on roll number
        // const photoUrl = await getPhotoUrlByRollNo(data.rollNo);
        // Use proxy URL to bypass browser blocking
        const driveUrl = await getPhotoUrlByRollNo(data.rollNo);
        const photoUrl = driveUrl ? `/api/photos/proxy?rollNo=${data.rollNo}` : null;

        // Check Status
        if (data.status === 'used') {
            return NextResponse.json({
                valid: false,
                status: 'used',
                participant: {
                    name: data.name,
                    college: data.college,
                    event_name: data.event_name,
                    ticket_id: data.ticket_id,
                    rollNo: data.rollNo,
                    photoUrl: photoUrl,
                    check_in_time: data.check_in_time?.toDate().toLocaleString() || 'Unknown'
                },
                message: 'Already Checked In'
            });
        }

        // Mark as Used
        await doc.ref.update({
            status: 'used',
            check_in_time: new Date()
        });

        return NextResponse.json({
            valid: true,
            status: 'verified',
            participant: {
                name: data.name,
                college: data.college,
                event_name: data.event_name,
                ticket_id: data.ticket_id,
                rollNo: data.rollNo,
                photoUrl: photoUrl,
            },
            message: 'Verified Successfully'
        });

    } catch (error: any) {
        console.error('Verification Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
