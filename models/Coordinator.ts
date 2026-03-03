import mongoose, { Schema, Document } from 'mongoose';

export interface ICoordinator extends Document {
    eventId: string;
    userId: string;
    rollNo: string;
    department?: string;
    password?: string; // Optional if we manage it separately
    allowedDepartments: string[];
    adminId: string;
    createdAt: Date;
    updatedAt: Date;
}

const CoordinatorSchema: Schema = new Schema({
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    rollNo: { type: String, required: true },
    department: { type: String },
    password: { type: String }, // Hashed password
    allowedDepartments: [{ type: String }],
    adminId: { type: String, required: true, index: true }
}, {
    timestamps: true
});

CoordinatorSchema.index({ eventId: 1, rollNo: 1 }, { unique: true });

export default mongoose.models.Coordinator || mongoose.model<ICoordinator>('Coordinator', CoordinatorSchema);
