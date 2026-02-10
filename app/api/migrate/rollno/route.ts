import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
    try {
        // Get all participants
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: false,
                message: 'No participants found'
            });
        }

        let updatedCount = 0;
        let skippedCount = 0;
        const batch = adminDb.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Check if rollNo is null or empty and other_details has Roll No
            if ((!data.rollNo || data.rollNo === null) && data.other_details) {
                // Try to find Roll No in other_details
                const rollNoValue = data.other_details['Roll No']
                    || data.other_details['Roll Number']
                    || data.other_details['Reg No']
                    || data.other_details['Register Number']
                    || data.other_details['RollNo']
                    || data.other_details['RegNo'];

                if (rollNoValue) {
                    batch.update(doc.ref, {
                        rollNo: rollNoValue.toString().trim()
                    });
                    updatedCount++;
                    batchCount++;

                    // Firestore batch limit is 500
                    if (batchCount >= 500) {
                        await batch.commit();
                        batchCount = 0;
                    }
                } else {
                    skippedCount++;
                }
            } else {
                skippedCount++;
            }
        }

        // Commit any remaining updates
        if (batchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: 'Migration completed successfully',
            stats: {
                total: snapshot.size,
                updated: updatedCount,
                skipped: skippedCount
            }
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Migration failed'
            },
            { status: 500 }
        );
    }
}
