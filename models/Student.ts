import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
    adminId: string;
    rollNo: string;
    name: string;
    email?: string;
    photo?: string; // Base64 or URL
    customFields: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const StudentSchema: Schema = new Schema({
    adminId: { type: String, required: true, index: true },
    rollNo: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    photo: { type: String }, // Can be a large base64 string
    customFields: { type: Map, of: Schema.Types.Mixed, default: {} }
}, {
    timestamps: true
});

StudentSchema.index({ adminId: 1, rollNo: 1 }, { unique: true });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
