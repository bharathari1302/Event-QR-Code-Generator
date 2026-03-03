import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
    document_id: string; // To maintain compatibility with existing frontend code if needed, though _id is standard in Mongo
    event_id: string;
    event_name: string;
    sub_event_name: string;
    name: string;
    email: string;
    rollNo: string;
    department: string;
    college: string;
    year: string;
    phone: string;
    foodPreference: string;
    roomNo: string;
    status: string; // e.g. 'generated', 'sent'
    ticket_id: string;
    token: string;
    allowedMeals?: string[];
    tokenUsage?: { [key: string]: boolean };
    check_in_time?: Date;
    [key: string]: any; // for dynamic check_in fields like check_in_breakfast
    createdAt: Date;
    updatedAt: Date;
}

const ParticipantSchema: Schema = new Schema({
    document_id: { type: String }, // Optional, can just use _id
    event_id: { type: String, required: true, index: true },
    event_name: { type: String },
    sub_event_name: { type: String },
    name: { type: String, required: true },
    email: { type: String },
    rollNo: { type: String, index: true },
    department: { type: String },
    college: { type: String },
    year: { type: String },
    phone: { type: String },
    foodPreference: { type: String, default: 'Veg' },
    roomNo: { type: String },
    status: { type: String, default: 'generated' },
    ticket_id: { type: String, index: true },
    token: { type: String, required: true, index: true },
    allowedMeals: [{ type: String }],
    tokenUsage: { type: Map, of: Boolean, default: {} },
    check_in_time: { type: Date }
}, {
    timestamps: true,
    strict: false // Allows for dynamic check_in_mealtime entries
});

// Compound index to help with deduplication queries
ParticipantSchema.index({ event_id: 1, email: 1 });
ParticipantSchema.index({ event_id: 1, rollNo: 1 });

export default mongoose.models.Participant || mongoose.model<IParticipant>('Participant', ParticipantSchema);
