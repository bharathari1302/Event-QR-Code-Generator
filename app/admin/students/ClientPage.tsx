'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Search, Plus, Upload, Loader2, DownloadCloud, Columns, Eye, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import * as XLSX from 'xlsx';

interface FormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
    isCore?: boolean;
}

type Student = {
    _id: string;
    rollNo: string;
    name: string;
    email?: string;
    photo?: string;
    customFields?: Record<string, any>;
};

export default function StudentsClientPage() {
    const { user, role, loading: authLoading, adminId } = useAuth();
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form Config State
    const [formFields, setFormFields] = useState<FormField[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState<any>({
        rollNo: '', name: '', email: '', photo: '', customFields: {}
    });
    const [saving, setSaving] = useState(false);

    // Columns state
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [showColumnModal, setShowColumnModal] = useState(false);

    // View State
    const [viewStudent, setViewStudent] = useState<Student | null>(null);

    const toggleColumn = (id: string, checked: boolean) => {
        const newCols = checked ? [...visibleColumns, id] : visibleColumns.filter(c => c !== id);
        setVisibleColumns(newCols);
        if (adminId) localStorage.setItem(`student_cols_${adminId}`, JSON.stringify(newCols));
    };

    useEffect(() => {
        if (!authLoading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            } else {
                fetchConfig();
                fetchStudents();
            }
        }
    }, [user, role, authLoading, router]);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/settings/student-form');
            const data = await res.json();
            if (data.success && data.config) {
                const fetchedFields = data.config.formFields || [];
                setFormFields(fetchedFields);
                
                if (adminId) {
                    const saved = localStorage.getItem(`student_cols_${adminId}`);
                    if (saved) {
                        try {
                            setVisibleColumns(JSON.parse(saved));
                        } catch (e) {}
                    } else {
                        // Default to core identifiers
                        setVisibleColumns(fetchedFields.slice(0, 3).map((f: FormField) => f.id));
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/students');
            const data = await res.json();
            if (data.success) {
                setStudents(data.students);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map data to Student schema using dynamic fields
                const mappedData = data.map((row: any) => {
                    const customFields: Record<string, any> = {};
                    // Extract fields based on the configured labels matching the column headers
                    formFields.forEach(field => {
                        if (row[field.label] !== undefined) {
                            customFields[field.id] = String(row[field.label]);
                        }
                    });

                    const rollNo = (customFields['core_rollNo'] || String(row['Roll No'] || row['Roll Number'] || row['rollNo'] || '')).trim().toUpperCase();
                    const name = customFields['core_name'] || row['Name'] || row['name'] || '';
                    const email = customFields['core_email'] || row['Email'] || row['email'] || '';
                    
                    delete customFields['core_rollNo'];
                    delete customFields['core_name'];
                    delete customFields['core_email'];

                    return {
                        rollNo,
                        name,
                        email,
                        customFields
                    };
                }).filter(s => s.rollNo && s.name); // basic validation

                if (mappedData.length === 0) {
                    alert("No valid students found. Ensure headers contain 'Roll No' and 'Name'.");
                    setIsUploading(false);
                    return;
                }

                // Call bulk upload API
                const res = await fetch('/api/students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mappedData)
                });
                const responseData = await res.json();
                
                if (responseData.success) {
                    alert(responseData.message);
                    fetchStudents();
                } else {
                    alert("Upload error: " + responseData.error);
                }
            } catch (err: any) {
                alert("Failed to parse file: " + err.message);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                 setFormData((prev: any) => ({ ...prev, photo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        const payload = { ...formData };
        if (payload.customFields) {
            if (payload.customFields['core_rollNo']) payload.rollNo = payload.customFields['core_rollNo'].toUpperCase();
            if (payload.customFields['core_name']) payload.name = payload.customFields['core_name'];
            if (payload.customFields['core_email']) payload.email = payload.customFields['core_email'];
            if (payload.customFields['core_photo']) payload.photo = payload.customFields['core_photo'];
            
            delete payload.customFields['core_rollNo'];
            delete payload.customFields['core_name'];
            delete payload.customFields['core_email'];
            delete payload.customFields['core_photo'];
        }

        try {
            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setFormData({ rollNo: '', name: '', email: '', photo: '', customFields: {} });
                fetchStudents();
            } else {
                alert(data.error || "Failed to save student");
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to completely delete ${name}? This action cannot be globally undone.`)) return;
        try {
            const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchStudents();
            } else {
                alert('Failed to delete student');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getFieldValue = (fieldId: string) => {
        if (fieldId === 'core_rollNo') return formData.rollNo || formData.customFields?.['core_rollNo'] || '';
        if (fieldId === 'core_name') return formData.name || formData.customFields?.['core_name'] || '';
        if (fieldId === 'core_email') return formData.email || formData.customFields?.['core_email'] || '';
        if (fieldId === 'core_photo') return formData.photo || formData.customFields?.['core_photo'] || '';
        return formData.customFields?.[fieldId] || '';
    };

    const setFieldValue = (fieldId: string, value: any) => {
        if (fieldId === 'core_rollNo') setFormData({ ...formData, rollNo: value.toUpperCase(), customFields: { ...formData.customFields, [fieldId]: value.toUpperCase() } });
        else if (fieldId === 'core_name') setFormData({ ...formData, name: value, customFields: { ...formData.customFields, [fieldId]: value } });
        else if (fieldId === 'core_email') setFormData({ ...formData, email: value, customFields: { ...formData.customFields, [fieldId]: value } });
        else if (fieldId === 'core_photo') setFormData({ ...formData, photo: value, customFields: { ...formData.customFields, [fieldId]: value } });
        else setFormData({ ...formData, customFields: { ...formData.customFields, [fieldId]: value } });
    };

    const handleDownloadTemplate = () => {
        const headers = formFields.map(f => f.label);
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Student_Directory_Template.xlsx");
    };

    const filtered = students.filter(s => 
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeColumns = formFields.filter(f => visibleColumns.includes(f.id));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Registry</h1>
                    <p className="text-muted-foreground mt-1">Manage global student data and profiles.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <DownloadCloud className="w-4 h-4 mr-2" />
                        Template
                    </Button>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                    <Button variant="outline" onClick={() => setShowColumnModal(true)}>
                        <Columns className="w-4 h-4 mr-2" />
                        Columns
                    </Button>
                    <Button onClick={() => {
                        setFormData({ rollNo: '', name: '', email: '', photo: '', customFields: {} });
                        setShowModal(true);
                    }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Student
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by Roll No, Name or Dept..."
                            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                        Total: {students.length}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-muted/40 uppercase text-xs text-muted-foreground font-semibold">
                                <tr>
                                    {activeColumns.map(col => (
                                        <th key={col.id} className="px-6 py-4">{col.label}</th>
                                    ))}
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeColumns.length + 2} className="py-12 text-center text-muted-foreground">
                                            No students found in global registry.
                                        </td>
                                    </tr>
                                ) : filtered.map(student => (
                                    <tr key={student._id} className="hover:bg-muted/30 transition-colors">
                                        {activeColumns.map(col => {
                                            let val: any = '-';
                                            if (col.id === 'core_rollNo') val = student.rollNo;
                                            else if (col.id === 'core_name') val = student.name;
                                            else if (col.id === 'core_email') val = student.email || '-';
                                            else if (col.id === 'core_photo') val = student.photo || '';
                                            else val = student.customFields?.[col.id] || '';
                                            
                                            if (col.type === 'file_upload' || col.id === 'core_photo') {
                                                return (
                                                    <td key={col.id} className="px-6 py-4 items-center">
                                                        {val && val !== '-' ? (
                                                            <img src={String(val)} alt="File" className="w-8 h-8 rounded-full object-cover border" />
                                                        ) : (
                                                            <span className="text-xs italic opacity-50">None</span>
                                                        )}
                                                    </td>
                                                );
                                            }
                                            
                                            // Make Roll No visually distinct to look professional
                                            if (col.id === 'core_rollNo') {
                                                return <td key={col.id} className="px-6 py-4 font-mono font-medium text-blue-600">{val || '-'}</td>;
                                            }
                                            if (col.id === 'core_name') {
                                                return <td key={col.id} className="px-6 py-4 font-medium text-foreground">{val || '-'}</td>;
                                            }

                                            return (
                                                <td key={col.id} className="px-6 py-4 text-muted-foreground truncate max-w-[150px]">
                                                    {val || '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 text-right space-x-1">
                                            <button onClick={() => setViewStudent(student)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => {
                                                setFormData({
                                                    _id: student._id,
                                                    rollNo: student.rollNo,
                                                    name: student.name,
                                                    email: student.email || '',
                                                    photo: student.photo || '',
                                                    customFields: student.customFields || {}
                                                });
                                                setShowModal(true);
                                            }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Student">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteStudent(student._id, student.name)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete Student">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Columns Modal */}
            {showColumnModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-sm rounded-xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                            <h2 className="text-lg font-bold">Customize Columns</h2>
                            <button onClick={() => setShowColumnModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
                            {formFields.map(field => (
                                <label key={field.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/50 rounded-md">
                                    <input 
                                        type="checkbox" 
                                        checked={visibleColumns.includes(field.id)}
                                        onChange={e => toggleColumn(field.id, e.target.checked)}
                                        className="w-4 h-4 text-primary focus:ring-primary rounded border-input bg-background"
                                    />
                                    <span className="text-sm font-medium">{field.label}</span>
                                    {field.isCore && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-auto">Core</span>}
                                </label>
                            ))}
                        </div>
                        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
                            <Button onClick={() => setShowColumnModal(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Student Modal */}
            {viewStudent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-4xl rounded-xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border bg-muted/20 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">View Student Details</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Detailed global profile information</p>
                            </div>
                            <button onClick={() => setViewStudent(null)} className="text-muted-foreground hover:bg-muted p-1.5 rounded-md transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 border-b border-border max-h-[68vh] overflow-y-auto custom-scrollbar">
                            <div className="md:col-span-1 p-5 border-r border-border bg-muted/10">
                                <div className="rounded-xl overflow-hidden border border-border bg-background">
                                    {viewStudent.photo ? (
                                        <img src={viewStudent.photo} alt={viewStudent.name} className="w-full h-[320px] object-cover" />
                                    ) : (
                                        <div className="w-full h-[320px] flex items-center justify-center bg-muted/40 text-primary font-bold text-6xl">
                                            {viewStudent.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 space-y-1">
                                    <h3 className="text-lg font-bold text-foreground break-words">{viewStudent.name}</h3>
                                    <p className="text-blue-600 font-mono text-sm font-semibold">{viewStudent.rollNo}</p>
                                </div>
                            </div>

                            <div className="md:col-span-2 p-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {formFields.filter(f => f.id !== 'core_photo').map(field => {
                                        let val: any = '-';
                                        if (field.id === 'core_rollNo') val = viewStudent.rollNo;
                                        else if (field.id === 'core_name') val = viewStudent.name;
                                        else if (field.id === 'core_email') val = viewStudent.email || '-';
                                        else val = viewStudent.customFields?.[field.id] || '-';

                                        if (field.type === 'file_upload') {
                                            return (
                                                <div key={field.id} className="space-y-1 sm:col-span-2">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</span>
                                                    <div className="mt-1 rounded-lg border border-border p-2 bg-muted/20">
                                                        {val && val !== '-' ? (
                                                            <img src={String(val)} alt="Uploaded File" className="w-28 h-28 rounded-md object-cover border" />
                                                        ) : (
                                                            <span className="text-sm italic opacity-60">Not provided</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={field.id} className="space-y-1">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{field.label}</span>
                                                <div className="text-sm font-medium text-foreground break-words bg-muted/20 px-3 py-2.5 rounded-lg border border-border/60 min-h-[42px] flex items-center">
                                                    {val || '-'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/10 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => {
                                setFormData({
                                    _id: viewStudent._id,
                                    rollNo: viewStudent.rollNo,
                                    name: viewStudent.name,
                                    email: viewStudent.email || '',
                                    photo: viewStudent.photo || '',
                                    customFields: viewStudent.customFields || {}
                                });
                                setViewStudent(null);
                                setShowModal(true);
                            }}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                            </Button>
                            <Button onClick={() => setViewStudent(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border bg-muted/20 shrink-0">
                            <h2 className="text-xl font-bold text-foreground">Add/Edit Student</h2>
                            <p className="text-sm text-muted-foreground mt-1">Enter global details for this participant.</p>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <form id="student-form" onSubmit={handleSaveStudent} className="space-y-4">

                                {formFields.length === 0 && <p className="text-sm text-muted-foreground">No form fields configured. Set them in the Forms section.</p>}
                                {formFields.map(field => (
                                    <div key={field.id}>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            {field.label} {field.required && <span className="text-destructive">*</span>}
                                        </label>
                                        
                                        {(field.type === 'short_answer' || field.type === 'file_upload') && (
                                            <div className="space-y-2">
                                                {field.type === 'file_upload' && getFieldValue(field.id) && (
                                                    <div className="flex items-center gap-4">
                                                        <img src={getFieldValue(field.id)} alt="Preview" className="w-12 h-12 rounded-full object-cover border shrink-0 bg-muted/20" />
                                                        <button type="button" onClick={() => setFieldValue(field.id, '')} className="text-destructive text-sm font-medium">Remove</button>
                                                    </div>
                                                )}
                                                <input
                                                    required={field.required && !getFieldValue(field.id)}
                                                    type={field.type === 'file_upload' ? 'file' : 'text'}
                                                    accept={field.type === 'file_upload' ? "image/*" : undefined}
                                                    className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                                                    value={field.type === 'file_upload' ? '' : getFieldValue(field.id)}
                                                    onChange={e => {
                                                        if (field.type === 'file_upload') {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    setFieldValue(field.id, reader.result as string);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                            return;
                                                        }
                                                        setFieldValue(field.id, e.target.value);
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {field.type === 'paragraph' && (
                                            <textarea
                                                required={field.required}
                                                className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none min-h-[80px]"
                                                value={getFieldValue(field.id)}
                                                onChange={e => setFieldValue(field.id, e.target.value)}
                                            />
                                        )}

                                        {field.type === 'dropdown' && (
                                            <select
                                                required={field.required}
                                                className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                                                value={getFieldValue(field.id)}
                                                onChange={e => setFieldValue(field.id, e.target.value)}
                                            >
                                                <option value="" disabled>Choose</option>
                                                {field.options?.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'multiple_choice' && (
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                {field.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-2">
                                                        <input 
                                                            type="radio"
                                                            required={field.required}
                                                            name={`field-${field.id}`}
                                                            value={opt}
                                                            checked={getFieldValue(field.id) === opt}
                                                            onChange={e => setFieldValue(field.id, e.target.value)}
                                                        />
                                                        <span className="text-sm">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {field.type === 'checkboxes' && (
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                {field.options?.map((opt, i) => {
                                                    const currentVals = getFieldValue(field.id) || [];
                                                    return (
                                                        <label key={i} className="flex items-center gap-2">
                                                            <input 
                                                                type="checkbox"
                                                                checked={currentVals.includes(opt)}
                                                                onChange={e => {
                                                                    const checked = e.target.checked;
                                                                    const newVals = checked 
                                                                        ? [...currentVals, opt] 
                                                                        : currentVals.filter((v: string) => v !== opt);
                                                                    setFieldValue(field.id, newVals);
                                                                }}
                                                            />
                                                            <span className="text-sm">{opt}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </form>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/10 shrink-0 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" form="student-form" isLoading={saving} disabled={saving}>
                                Save Record
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
