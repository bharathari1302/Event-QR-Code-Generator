import mongoose, { Schema, Document } from 'mongoose';

export interface FormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
}

export interface IStudentFormConfig extends Document {
    adminId: string;
    joinFormTitle: string;
    updateFormTitle: string;
    formFields: FormField[];
    createdAt: Date;
    updatedAt: Date;
}

const StudentFormConfigSchema: Schema = new Schema({
    adminId: { type: String, required: true, unique: true, index: true },
    joinFormTitle: { type: String, default: 'Student Directory Registration', trim: true },
    updateFormTitle: { type: String, default: 'Update Missing Details', trim: true },
    formFields: { type: Array, required: true, default: [] }
}, {
    timestamps: true
});

export default mongoose.models.StudentFormConfig || mongoose.model<IStudentFormConfig>('StudentFormConfig', StudentFormConfigSchema);
