import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        // Search for specific user "BHARAT HARI S"
        const snapshot = await adminDb.collection('participants')
            .where('name', '>=', 'BHARAT HARI S')
            .where('name', '<=', 'BHARAT HARI S' + '\uf8ff')
            .get();

        const logs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                rollNo: data.rollNo,
                event_id: data.event_id,
                sub_event_name: data.sub_event_name,
                other_details: data.other_details || 'N/A'
            };
        });

        // Append to debug log
        const logMsg = `\n[DebugBHARAT] ${new Date().toISOString()}\n${JSON.stringify(logs, null, 2)}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'debug-photo.log'), logMsg);

        return NextResponse.json({ success: true, count: logs.length, message: "Check debug-photo.log for BHARAT" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
