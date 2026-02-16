import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const eventId = formData.get('eventId') as string;
        const subEventName = formData.get('subEventName') as string;

        if (!file || !eventId) {
            return NextResponse.json(
                { error: 'File and Event ID are required' },
                { status: 400 }
            );
        }

        // --- ALWAYS FETCH EVENT NAME FROM DB TO ENSURE CORRECTNESS ---
        let resolvedEventName = 'Event';
        if (eventId) {
            const eventDoc = await adminDb.collection('events').doc(eventId).get();
            if (eventDoc.exists) {
                resolvedEventName = eventDoc.data()?.name || 'Event';
            }
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length === 0) {
            return NextResponse.json(
                { error: 'Sheet is empty' },
                { status: 400 }
            );
        }

        const batch = adminDb.batch();
        const participantsRef = adminDb.collection('participants');
        let count = 0;

        jsonData.forEach((row: any) => {
            // Smart Parsing: Find all "Email" fields in this row
            const emailKeys = Object.keys(row).filter(key =>
                key.toLowerCase().includes('email') &&
                row[key] &&
                row[key].toString().includes('@')
            );

            // If no explicit "Email" columns found, check values for regex (fallback)
            if (emailKeys.length === 0) {
                Object.keys(row).forEach(key => {
                    if (row[key] && typeof row[key] === 'string' && row[key].includes('@')) {
                        emailKeys.push(key);
                    }
                });
            }

            // Deduplicate keys
            const uniqueEmailKeys = [...new Set(emailKeys)];

            uniqueEmailKeys.forEach(emailKey => {
                const email = row[emailKey].toString().trim();

                let name = 'Unknown';

                // Name Extraction Logic
                const nameKeyCandidate = emailKey.replace(/email/i, 'Name').replace(/mail/i, 'Name');
                if (row[nameKeyCandidate]) {
                    name = row[nameKeyCandidate];
                }
                else if (row['Name']) name = row['Name'];
                else if (row['name']) name = row['name'];
                else if (row['Student Name']) name = row['Student Name'];
                else if (row['Participant Name']) name = row['Participant Name'];
                else {
                    const prefix = emailKey.replace(/email/i, '').trim();
                    const matchingNameKey = Object.keys(row).find(k =>
                        k.toLowerCase().includes(prefix.toLowerCase()) &&
                        k.toLowerCase().includes('name')
                    );
                    if (matchingNameKey) name = row[matchingNameKey];
                }

                const docRef = participantsRef.doc();
                const token = uuidv4();

                // --- FUZZY KEY MATCHING ---
                // Finds a key in the row that loosely matches one of the keywords
                const findKey = (keywords: string[], excludeTerms: string[] = []) => Object.keys(row).find(k => {
                    const normalizedKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    // Check exclusions
                    if (excludeTerms.some(term => normalizedKey.includes(term.toLowerCase()))) return false;
                    // Check keywords
                    return keywords.some(keyword =>
                        normalizedKey.includes(keyword.replace(/[^a-z0-9]/g, '').toLowerCase())
                    );
                });

                const foodKey = findKey(['Food Preference', 'Food', 'Veg', 'Preference']);
                const roomKey = findKey(['Room No', 'Room Number', 'Room']);
                // Strict Roll No matching: Exclude food/diet related terms to prevent conflicts
                const rollKey = findKey(['Roll No', 'Roll Number', 'Reg No', 'Register Number'], ['veg', 'food', 'preference', 'diet', 'meal']);
                const collegeKey = findKey(['College', 'Institution']);
                const deptKey = findKey(['Department', 'Dept', 'Branch', 'Stream']);

                // Extract values using the found keys
                const foodPreference = (foodKey && row[foodKey]) ? row[foodKey].toString().trim() : 'Not Specified';
                const roomNo = (roomKey && row[roomKey]) ? row[roomKey].toString().trim() : null;
                const department = (deptKey && row[deptKey]) ? row[deptKey].toString().trim() : null;

                // Try to extract rollNo from the found key, or fallback to direct access
                let rollNo: string | null = (rollKey && row[rollKey]) ? row[rollKey].toString().trim() : null;

                // If not found, try direct access to common roll number column names
                if (!rollNo) {
                    const directRollKeys = ['Roll No', 'Roll Number', 'Reg No', 'Register Number', 'RollNo', 'RegNo'];
                    for (const key of directRollKeys) {
                        if (row[key]) {
                            rollNo = row[key].toString().trim();
                            break;
                        }
                    }
                }

                const college = (collegeKey && row[collegeKey]) ? row[collegeKey].toString().trim() : '';

                batch.set(docRef, {
                    document_id: docRef.id,
                    name: name,
                    email: email,
                    college: college,
                    event_name: resolvedEventName,
                    event_id: eventId,
                    sub_event_name: subEventName || '',

                    foodPreference: foodPreference,
                    roomNo: roomNo,
                    rollNo: rollNo,
                    department: department,

                    tokenUsage: {
                        breakfast: false,
                        lunch: false,
                        snacks: false,
                        dinner: false,
                        icecream: false
                    },

                    other_details: row,
                    token: token,
                    status: 'generated',
                    ticket_id: `INV-${Date.now().toString().slice(-6)}-${count}`,
                    created_at: new Date(),
                    check_in_time: null
                });
                count++;
            });
        });

        await batch.commit();

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${count} participants.`
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
