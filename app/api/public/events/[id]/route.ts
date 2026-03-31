import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
        }

        await connectDB();

        const eventUrl = await Event.findById(id).lean();

        if (!eventUrl || !eventUrl.isActive) {
            return NextResponse.json({ error: 'Event not found or inactive' }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true, 
            event: {
                name: eventUrl.name,
                description: eventUrl.description,
                venue: eventUrl.venue,
                date: eventUrl.date,
                isDynamicForm: eventUrl.isDynamicForm,
                formFields: eventUrl.formFields
            } 
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
