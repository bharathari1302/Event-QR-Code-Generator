import mongoose, { Schema, Document } from 'mongoose';

export interface IFormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
}

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
    isDynamicForm?: boolean;
    formFields?: IFormField[];
    createdAt: Date;
    updatedAt: Date;
}

const FormFieldSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'file_upload'], required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }]
});

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
    isDynamicForm: { type: Boolean, default: false },
    formFields: [FormFieldSchema],
}, {
    timestamps: true
});

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
