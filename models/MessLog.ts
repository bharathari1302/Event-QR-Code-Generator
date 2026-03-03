import mongoose, { Schema, Document } from 'mongoose';

export interface IMessLog extends Document {
    event_id: string;      // Which daily mess event this belongs to
    rollNo: string;        // The student's roll number
    mealType: string;      // e.g., 'breakfast', 'lunch', 'dinner'
    date: string;          // ISO Date string for uniqueness (e.g., '2026-03-03')
    scannedAt: Date;       // Exact timestamp of scan
    adminId: string;       // Tenant context
}

const MessLogSchema: Schema = new Schema({
    event_id: { type: String, required: true, index: true },
    rollNo: { type: String, required: true, index: true },
    mealType: { type: String, required: true },
    date: { type: String, required: true, index: true }, // Store as YYYY-MM-DD
    scannedAt: { type: Date, default: Date.now },
    adminId: { type: String, required: true, index: true },
}, {
    timestamps: true
});

// Compound index to prevent double scanning on the same day for the same meal
MessLogSchema.index({ event_id: 1, rollNo: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.models.MessLog || mongoose.model<IMessLog>('MessLog', MessLogSchema);
