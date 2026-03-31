'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Settings2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

export interface FormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
    isCore?: boolean;
}

interface FormBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

const FIELD_TYPES = [
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'checkboxes', label: 'Checkboxes' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'file_upload', label: 'File Upload (Photo/Doc)' }
];

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
    const addField = () => {
        const newField: FormField = {
            id: crypto.randomUUID(),
            type: 'short_answer',
            label: 'Untitled Question',
            required: false,
            options: []
        };
        onChange([...fields, newField]);
    };

    const removeField = (id: string) => {
        onChange(fields.filter(f => f.id !== id));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newFields = [...fields];
            [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
            onChange(newFields);
        } else if (direction === 'down' && index < fields.length - 1) {
            const newFields = [...fields];
            [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
            onChange(newFields);
        }
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const addOption = (fieldId: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field) {
            const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
            updateField(fieldId, { options: newOptions });
        }
    };

    const updateOption = (fieldId: string, index: number, value: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field && field.options) {
            const newOptions = [...field.options];
            newOptions[index] = value;
            updateField(fieldId, { options: newOptions });
        }
    };

    const removeOption = (fieldId: string, index: number) => {
        const field = fields.find(f => f.id === fieldId);
        if (field && field.options) {
            const newOptions = field.options.filter((_, i) => i !== index);
            updateField(fieldId, { options: newOptions });
        }
    };

    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="p-4 bg-muted/20 border border-border rounded-lg relative group">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-4">
                            <div className="flex gap-2 items-start">
                                <input
                                    type="text"
                                    value={field.label}
                                    onChange={e => updateField(field.id, { label: e.target.value })}
                                    className="flex-1 bg-background border-b-2 border-transparent focus:border-primary p-2 text-lg font-semibold focus:outline-none transition-colors"
                                    placeholder="Question Title"
                                />
                                <select
                                    value={field.type}
                                    disabled={field.isCore}
                                    title={field.isCore ? "Core fields cannot change type" : ""}
                                    onChange={e => updateField(field.id, { 
                                        type: e.target.value as FormField['type'],
                                        options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(e.target.value) && (!field.options || field.options.length === 0) ? ['Option 1'] : field.options
                                    })}
                                    className="p-2 border border-input rounded bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {FIELD_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Options builder for Multi-choice/Checkboxes/Dropdowns */}
                            {['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type) && (
                                <div className="space-y-2 pl-2 border-l-2 border-muted">
                                    {field.options?.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border border-muted-foreground/50 flex-shrink-0" />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => updateOption(field.id, i, e.target.value)}
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-border focus:border-primary px-1 outline-none text-sm"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => removeOption(field.id, i)}
                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button 
                                        type="button" 
                                        onClick={() => addOption(field.id)}
                                        className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                                    >
                                        <Plus className="w-3 h-3" /> Add Option
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-4 text-sm text-muted-foreground">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span>Required</span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${field.required ? 'bg-primary' : 'bg-muted-foreground/30'} ${(field.isCore && field.id !== 'core_email') ? 'opacity-50' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={field.required}
                                    disabled={field.isCore && field.id !== 'core_email'}
                                    onChange={e => updateField(field.id, { required: e.target.checked })}
                                />
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${field.required ? 'left-[18px]' : 'left-0.5'}`} />
                            </div>
                        </label>
                        {field.isCore && (
                            <span className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-md">Core Field</span>
                        )}
                        {!field.isCore && (
                            <>
                                <div className="w-px h-4 bg-border" />
                                <button 
                                    type="button" 
                                    onClick={() => removeField(field.id)}
                                    className="hover:text-destructive transition-colors"
                                    title="Remove Field"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <div className="w-px h-4 bg-border" />
                        <button type="button" onClick={() => moveField(index, 'up')} disabled={index === 0} title="Move Up" className="hover:text-primary transition-colors disabled:opacity-30">
                            <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1} title="Move Down" className="hover:text-primary transition-colors disabled:opacity-30">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            <Button type="button" variant="outline" onClick={addField} className="w-full border-dashed border-2 py-6">
                <Plus className="w-4 h-4 mr-2" /> Add Form Field
            </Button>
        </div>
    );
}
