
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Starting Roll No Backfill Migration...");
        const participantsRef = adminDb.collection('participants');
        const snapshot = await participantsRef.get();

        if (snapshot.empty) {
            return NextResponse.json({ message: 'No participants found to migrate.' });
        }

        let updatedCount = 0;
        let batch = adminDb.batch();
        let batchCount = 0;
        const BATCH_LIMIT = 400;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Skip if rollNo is already set
            if (data.rollNo && data.rollNo !== 'null' && data.rollNo !== '') {
                continue;
            }

            const otherDetails = data.other_details || {};
            let foundRollNo = null;

            // Search Strategy 1: Exact keys (Most common)
            if (otherDetails['Roll No']) foundRollNo = otherDetails['Roll No'];
            else if (otherDetails['Roll Number']) foundRollNo = otherDetails['Roll Number'];
            else if (otherDetails['Reg No']) foundRollNo = otherDetails['Reg No'];
            else if (otherDetails['Register Number']) foundRollNo = otherDetails['Register Number'];

            // Search Strategy 2: Relaxed Scan
            if (!foundRollNo) {
                const keys = Object.keys(otherDetails);
                const rollKey = keys.find(k => {
                    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return norm.includes('rollno') || norm.includes('rollnumber') || norm.includes('regno');
                });
                if (rollKey) {
                    foundRollNo = otherDetails[rollKey];
                }
            }

            if (foundRollNo) {
                const cleanRollNo = foundRollNo.toString().trim();
                batch.update(doc.ref, { rollNo: cleanRollNo });
                updatedCount++;
                batchCount++;

                if (batchCount >= BATCH_LIMIT) {
                    await batch.commit();
                    console.log(`Committed batch of ${batchCount} updates.`);
                    batchCount = 0;
                    batch = adminDb.batch(); // Reassign new batch
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch of ${batchCount} updates.`);
        }

        return NextResponse.json({
            success: true,
            totalScanned: snapshot.size,
            updatedCount: updatedCount,
            message: `Successfully backfilled Roll No for ${updatedCount} participants.`
        });

    } catch (error: any) {
        console.error('Migration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
