'use client';

import { useState, useEffect } from 'react';
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

export default function DirectoryJoinPage() {
    const params = useParams();
    const adminId = params.adminId as string;

    const [adminContext, setAdminContext] = useState<any>(null);
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [photoDataUrl, setPhotoDataUrl] = useState('');
    
    // Dynamic answers
    const [answers, setAnswers] = useState<Record<string, any>>({});

    const joinFormTitle = adminContext?.config?.joinFormTitle || 'Student Directory Registration';

    useEffect(() => {
        if (adminId) {
            fetchFormConfig();
        }
    }, [adminId]);

    const fetchFormConfig = async () => {
        try {
            const res = await fetch(`/api/public/admin-config/${adminId}`);
            const data = await res.json();
            if (data.success) {
                setAdminContext(data);
                setFormFields(data.config.formFields || []);
            } else {
                setError(data.error || 'Access Denied / Invalid Registration Link');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
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

    const handleProfilePhotoUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Profile photo must be an image');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Profile photos shouldn't be too large anyway
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
                setPhotoDataUrl(dataURL);
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
        setError('');
        setSubmitting(true);

        const rollNo = answers['core_rollNo']?.toUpperCase() || '';
        const name = answers['core_name'] || '';
        const email = answers['core_email'] || '';
        const photo = answers['core_photo'] || '';

        const customFields = { ...answers };
        delete customFields['core_rollNo'];
        delete customFields['core_name'];
        delete customFields['core_email'];
        delete customFields['core_photo'];

        try {
            const res = await fetch('/api/public/directory-join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId,
                    rollNo,
                    name,
                    email,
                    photo,
                    customFields
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSubmitted(true);
            } else {
                setError(data.error || 'Failed to submit form');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    if (error && !adminContext) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-gray-900">Registration Complete!</h1>
                    <p className="text-gray-600">Your profile is now securely registered with your institution's Global Directory.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="bg-white rounded-t-xl overflow-hidden shadow">
                    <div className="h-3 bg-primary w-full" />
                    <div className="p-8 space-y-2">
                        <h1 className="text-3xl font-bold text-gray-900">{joinFormTitle}</h1>
                        <p className="text-gray-600 mt-2">
                            Please fill out the form below to register your profile. This unified data will streamline your future event applications.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">


                    {/* Dynamic Config Elements */}
                    {formFields?.map((field: FormField) => (
                        <div key={field.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                            <label className="block text-base font-medium text-gray-900">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'short_answer' && (
                                <input
                                    type="text"
                                    required={field.required}
                                    className="w-full border-b-2 border-gray-200 focus:border-primary bg-transparent text-gray-900 p-2 outline-none transition-colors"
                                    placeholder="Your answer"
                                    value={answers[field.id] || ''}
                                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                />
                            )}

                            {field.type === 'paragraph' && (
                                <textarea
                                    required={field.required}
                                    className="w-full border-b-2 border-gray-200 focus:border-primary bg-transparent text-gray-900 p-2 outline-none transition-colors resize-y min-h-[100px]"
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
                                                className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
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
                                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
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
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
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
                        <span className="text-sm text-gray-500 font-medium tracking-wide">Secure Global Registration</span>
                        <Button 
                            type="submit" 
                            disabled={submitting}
                            isLoading={submitting}
                            className="w-32"
                        >
                            Submit
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
