import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    uid?: string;
    email?: string;
    passwordHash?: string;
    rollNo?: string;
    role: string;
    department?: string;
    otp?: string;
    otpExpiry?: Date;
    adminId?: string;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    uid: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String },
    rollNo: { type: String, sparse: true },
    role: { type: String, required: true, enum: ['admin', 'manager', 'coordinator', 'warden'] },
    department: { type: String, default: 'IT' },
    otp: { type: String },
    otpExpiry: { type: Date },
    adminId: { type: String, index: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Delete the cached model globally to prevent hot-reload schema drifting.
if (mongoose.models.User) {
    delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', UserSchema);
