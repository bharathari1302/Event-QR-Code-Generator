'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

interface FormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
}

export default function DirectoryUpdatePage() {
    const params = useParams();
    const adminId = params.adminId as string;
    const [updateFormTitle, setUpdateFormTitle] = useState('Update Missing Details');

    const [rollNo, setRollNo] = useState('');
    const [fetchingProf, setFetchingProf] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [studentData, setStudentData] = useState<{name: string, rollNo: string} | null>(null);

    const [missingFields, setMissingFields] = useState<FormField[]>([]);
    
    // UI states
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState('');
    
    // Dynamic answers for the missing fields
    const [answers, setAnswers] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!adminId) return;

        const loadTitle = async () => {
            try {
                const res = await fetch(`/api/public/admin-config/${adminId}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    setUpdateFormTitle(data.config?.updateFormTitle || 'Update Missing Details');
                }
            } catch {
                // Keep fallback title
            }
        };

        loadTitle();
    }, [adminId]);

    const handleFetchProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rollNo.trim()) return;

        setFetchError('');
        setFetchingProf(true);
        setStudentData(null);
        setMissingFields([]);
        setAnswers({});

        try {
            const res = await fetch(`/api/public/directory-update/${adminId}/${encodeURIComponent(rollNo.trim())}`);
            const data = await res.json();
            
            if (res.ok && data.success) {
                setStudentData(data.student);
                setMissingFields(data.missingFields || []);
            } else {
                setFetchError(data.error || 'Student not found. Please verify your Roll No.');
            }
        } catch (e: any) {
            setFetchError(e.message || 'An error occurred while fetching your profile.');
        } finally {
            setFetchingProf(false);
        }
    };

    // Compress File and Convert to Base64
    const handleFileUploadConfig = async (fieldId: string, file: File) => {
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAnswers(prev => ({ ...prev, [fieldId]: reader.result as string }));
            };
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataURL = canvas.toDataURL('image/jpeg', 0.6);
                setAnswers(prev => ({ ...prev, [fieldId]: dataURL }));
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
        setAnswers(prev => {
            const current = (prev[fieldId] as string[]) || [];
            if (checked) {
                return { ...prev, [fieldId]: [...current, option] };
            } else {
                return { ...prev, [fieldId]: current.filter(o => o !== option) };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/public/directory-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId,
                    rollNo: studentData!.rollNo,
                    updates: answers
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSubmitted(true);
            } else {
                setSubmitError(data.error || 'Failed to submit updates');
            }
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">Profile Updated!</h1>
                    <p className="text-gray-600">Your missing details were successfully added to the Global Directory.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-t-xl overflow-hidden shadow">
                    <div className="h-3 bg-purple-600 w-full" />
                    <div className="p-8 space-y-2">
                        <h1 className="text-3xl font-bold text-gray-900">{updateFormTitle}</h1>
                        <p className="text-gray-600 mt-2">
                            Enter your Roll Number to safely securely verify your identity and provide any missing dynamic information required by your institution.
                        </p>
                    </div>
                </div>

                {/* Step 1: Verification */}
                {!studentData && (
                    <form onSubmit={handleFetchProfile} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-medium text-gray-700">Student Roll No</label>
                            <input
                                type="text"
                                required
                                placeholder="Enter your registered Roll No (e.g., 24AIR001)"
                                className="w-full border-2 border-gray-200 focus:border-purple-600 rounded-lg p-2.5 outline-none transition-colors uppercase"
                                value={rollNo}
                                onChange={e => setRollNo(e.target.value)}
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={fetchingProf || !rollNo}
                            isLoading={fetchingProf}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            Find Record
                        </Button>
                    </form>
                )}

                {fetchError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">
                        {fetchError}
                    </div>
                )}
                {submitError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">
                        {submitError}
                    </div>
                )}

                {/* Step 2: Missing Fields Form */}
                {studentData && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-purple-50 p-4 rounded-lg flex items-center justify-between border border-purple-100">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">Verified Identity</p>
                                <p className="text-lg font-bold text-purple-900">{studentData.name} ({studentData.rollNo})</p>
                            </div>
                            <Button variant="ghost" type="button" onClick={() => { setStudentData(null); setRollNo(''); }} className="text-purple-700 hover:bg-purple-100">
                                Change
                            </Button>
                        </div>

                        {missingFields.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-3">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                                <h3 className="text-xl font-bold text-gray-900">All Caught Up!</h3>
                                <p className="text-gray-600">Your profile is 100% complete. There are no missing details required.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-orange-100 bg-orange-50/50">
                                    <p className="text-sm font-medium text-orange-800">Please provide the {missingFields.length} missing detail(s) below.</p>
                                </div>
                                
                                {missingFields.map((field: FormField) => (
                                    <div key={field.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl"></div>
                                        <label className="block text-base font-medium text-gray-900">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>

                                        {field.type === 'short_answer' && (
                                            <input
                                                type="text"
                                                required={field.required}
                                                className="w-full border-b-2 border-gray-200 focus:border-purple-600 bg-transparent text-gray-900 p-2 outline-none transition-colors"
                                                placeholder="Your answer"
                                                value={answers[field.id] || ''}
                                                onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                            />
                                        )}

                                        {field.type === 'paragraph' && (
                                            <textarea
                                                required={field.required}
                                                className="w-full border-b-2 border-gray-200 focus:border-purple-600 bg-transparent text-gray-900 p-2 outline-none transition-colors resize-y min-h-[100px]"
                                                placeholder="Your answer"
                                                value={answers[field.id] || ''}
                                                onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                            />
                                        )}

                                        {field.type === 'multiple_choice' && (
                                            <div className="space-y-3 mt-2">
                                                {field.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={field.id}
                                                            required={field.required}
                                                            value={opt}
                                                            checked={answers[field.id] === opt}
                                                            onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                                            className="w-4 h-4 text-purple-600 focus:ring-purple-600 border-gray-300"
                                                        />
                                                        <span className="text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {field.type === 'checkboxes' && (
                                            <div className="space-y-3 mt-2">
                                                {field.options?.map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-3 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-600"
                                                            checked={(answers[field.id] || []).includes(opt)}
                                                            onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)}
                                                        />
                                                        <span className="text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {field.type === 'dropdown' && (
                                            <select
                                                required={field.required}
                                                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                                                value={answers[field.id] || ''}
                                                onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                            >
                                                <option value="" disabled>Choose</option>
                                                {field.options?.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'file_upload' && (
                                            <div className="mt-2">
                                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                                        {answers[field.id] ? (
                                                            <p className="text-sm text-green-600 font-medium">File uploaded locally.</p>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">Click to upload (max 5MB)</p>
                                                        )}
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        className="hidden" 
                                                        required={field.required && !answers[field.id]}
                                                        onChange={e => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                handleFileUploadConfig(field.id, e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                {answers[field.id] && (
                                                    <div className="mt-4">
                                                        <img src={answers[field.id]} alt="Preview" className="w-24 h-24 object-cover rounded-md border" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <span className="text-sm text-gray-500 font-medium tracking-wide">Secure Update Form</span>
                                    <Button 
                                        type="submit" 
                                        disabled={submitting}
                                        isLoading={submitting}
                                        className="w-40 bg-purple-600 hover:bg-purple-700 text-white"
                                    >
                                        Submit Missing Data
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
