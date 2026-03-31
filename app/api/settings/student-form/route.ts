import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import StudentFormConfig from '@/models/StudentFormConfig';

const DEFAULT_CORE_FIELDS = [
    { id: 'core_rollNo', type: 'short_answer', label: 'Roll No', required: true, isCore: true },
    { id: 'core_name', type: 'short_answer', label: 'Name', required: true, isCore: true },
    { id: 'core_email', type: 'short_answer', label: 'Contact Email', required: false, isCore: true },
    { id: 'core_photo', type: 'file_upload', label: 'Student Photo', required: false, isCore: true }
];

const DEFAULT_JOIN_FORM_TITLE = 'Student Directory Registration';
const DEFAULT_UPDATE_FORM_TITLE = 'Update Missing Details';

function ensureCoreFields(fields: any[]): any[] {
    const existingIds = fields.map(f => f.id);
    let updatedFields = [...fields];
    
    DEFAULT_CORE_FIELDS.forEach(core => {
        if (!existingIds.includes(core.id)) {
            updatedFields.push(core);
        } else {
            const idx = updatedFields.findIndex(f => f.id === core.id);
            updatedFields[idx] = { 
                ...updatedFields[idx], 
                isCore: true, 
                type: core.type,
            };
            if (core.id !== 'core_email' && core.id !== 'core_photo') {
                updatedFields[idx].required = true;
            }
        }
    });

    return updatedFields;
}

export async function GET(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        await connectDB();
        
        let config = await StudentFormConfig.findOne({ adminId }).lean();
        
        if (!config) {
            // Default config if none exists
            config = {
                adminId,
                joinFormTitle: DEFAULT_JOIN_FORM_TITLE,
                updateFormTitle: DEFAULT_UPDATE_FORM_TITLE,
                formFields: ensureCoreFields([])
            };
        } else {
            config.formFields = ensureCoreFields(config.formFields || []);
            config.joinFormTitle = (config as any).joinFormTitle || DEFAULT_JOIN_FORM_TITLE;
            config.updateFormTitle = (config as any).updateFormTitle || DEFAULT_UPDATE_FORM_TITLE;
        }
        
        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) {
            return NextResponse.json({ error: 'Unauthorized: Missing Admin Context' }, { status: 401 });
        }

        const { formFields, joinFormTitle, updateFormTitle } = await req.json();

        if (!Array.isArray(formFields)) {
            return NextResponse.json({ error: 'formFields must be an array' }, { status: 400 });
        }

        await connectDB();

        const config = await StudentFormConfig.findOneAndUpdate(
            { adminId },
            {
                adminId,
                formFields: ensureCoreFields(formFields),
                joinFormTitle: (joinFormTitle || DEFAULT_JOIN_FORM_TITLE).trim(),
                updateFormTitle: (updateFormTitle || DEFAULT_UPDATE_FORM_TITLE).trim()
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, config });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
