import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
    name: string;
    eventType?: 'special' | 'daily'; // To differentiate event types
    date: Date | string;
    options?: string[];
    subEvents?: string[];
    googleSheetId?: string;
    googleSheetName?: string;
    syncSubType?: string;
    syncMealName?: string;
    driveFolderId?: string;
    isActive: boolean;
    adminId: string;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema: Schema = new Schema({
    name: { type: String, required: true },
    eventType: { type: String, enum: ['special', 'daily'], default: 'special' },
    date: { type: Date, required: true },
    options: [{ type: String }],
    subEvents: [{ type: String }],
    googleSheetId: { type: String },
    googleSheetName: { type: String },
    syncSubType: { type: String },
    syncMealName: { type: String },
    driveFolderId: { type: String },
    isActive: { type: Boolean, default: true },
    adminId: { type: String, required: true, index: true },
}, {
    timestamps: true
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
