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

export default function PublicFormPage() {
    const params = useParams();
    const eventId = params.eventId as string;

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [rollNo, setRollNo] = useState('');
    const [globalStudent, setGlobalStudent] = useState<any>(null);
    const [verifying, setVerifying] = useState(false);

    const [answers, setAnswers] = useState<Record<string, any>>({});

    useEffect(() => {
        if (eventId) {
            fetchEventData();
        }
    }, [eventId]);

    const fetchEventData = async () => {
        try {
            const res = await fetch(`/api/public/events/${eventId}`);
            const data = await res.json();
            if (data.success) {
                setEvent(data.event);
            } else {
                setError(data.error || 'Event not found');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRollNo = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setVerifying(true);

        try {
            const res = await fetch(`/api/public/students/${rollNo}?eventId=${eventId}`);
            const data = await res.json();
            if (data.success && data.student) {
                setGlobalStudent(data.student);
                if (data.student.photo) {
                    const nextAnswers = { ...answers };
                    event?.formFields?.forEach((field: FormField) => {
                        if (field.type === 'file_upload') {
                            nextAnswers[field.id] = data.student.photo;
                        }
                    });
                    setAnswers(nextAnswers);
                }
            } else {
                setError(data.error || 'Student not found in global directory. Please contact admin.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    const handleFileUpload = async (fieldId: string, file: File) => {
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
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
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
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/public/submit-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    rollNo,
                    answers
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Loading form...</p>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-200/60">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h1 className="text-2xl font-black text-red-600 mb-2">Error</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-gray-200/60 animate-scale-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-50 to-green-50 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">Success!</h1>
                    <p className="text-slate-500">Your registration has been submitted successfully.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-200/60 animate-fade-in-up">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 w-full" />
                    <div className="p-8 space-y-2">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{event?.name}</h1>
                        {event?.description && (
                            <p className="text-slate-500 mt-2">{event.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-4">
                            {event?.venue && (
                                <div className="text-sm font-medium text-slate-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    📍 {event.venue}
                                </div>
                            )}
                            <div className="text-sm font-medium text-slate-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                📅 {new Date(event?.date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-200/60 animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Step 1: Roll No Verification */}
                {!globalStudent ? (
                    <form onSubmit={handleVerifyRollNo} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200/60 space-y-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <label className="block text-base font-bold text-slate-800">
                            Enter your Roll Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. 21BCE100"
                            className="w-full border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent text-slate-800 p-3 outline-none uppercase font-mono text-lg transition-colors"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                        />
                        <Button type="submit" variant="gradient" disabled={verifying} isLoading={verifying} className="w-full mt-4">
                            Verify & Continue
                        </Button>
                    </form>
                ) : (
                    <>
                        {/* Student Profile Card */}
                        <div className="bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-6 rounded-3xl shadow-sm border border-indigo-100/60 flex flex-col sm:flex-row gap-4 items-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            {globalStudent.photo ? (
                                <img src={globalStudent.photo} alt={globalStudent.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                                    {globalStudent.name.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 text-center sm:text-left">
                                <h2 className="text-xl font-black text-slate-800">{globalStudent.name}</h2>
                                <div className="text-sm text-slate-500 flex flex-wrap gap-2 mt-1 justify-center sm:justify-start">
                                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{rollNo}</span>
                                    {globalStudent.department && <span className="text-slate-400">• {globalStudent.department}</span>}
                                </div>
                            </div>
                            <div className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold shrink-0 border border-emerald-200/40">
                                Verified ✓
                            </div>
                        </div>

                        {/* Form Elements */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                    {event?.formFields?.map((field: FormField, idx: number) => (
                        <div 
                            key={field.id} 
                            className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-200/60 space-y-4 animate-fade-in-up"
                            style={{ animationDelay: `${(idx + 2) * 100}ms`, opacity: 0 }}
                        >
                            <label className="block text-base font-bold text-slate-800">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'short_answer' && (
                                <input
                                    type="text"
                                    required={field.required}
                                    className="w-full border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent text-slate-800 p-2 outline-none transition-colors"
                                    placeholder="Your answer"
                                    value={answers[field.id] || ''}
                                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                />
                            )}

                            {field.type === 'paragraph' && (
                                <textarea
                                    required={field.required}
                                    className="w-full border-b-2 border-gray-200 focus:border-indigo-500 bg-transparent text-slate-800 p-2 outline-none transition-colors resize-y min-h-[100px]"
                                    placeholder="Your answer"
                                    value={answers[field.id] || ''}
                                    onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                />
                            )}

                            {field.type === 'multiple_choice' && (
                                <div className="space-y-3 mt-2">
                                    {field.options?.map((opt, i) => (
                                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name={field.id}
                                                required={field.required}
                                                value={opt}
                                                checked={answers[field.id] === opt}
                                                onChange={e => setAnswers({ ...answers, [field.id]: e.target.value })}
                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="text-slate-700 group-hover:text-slate-900 transition-colors">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {field.type === 'checkboxes' && (
                                <div className="space-y-3 mt-2">
                                    {field.options?.map((opt, i) => (
                                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                checked={(answers[field.id] || []).includes(opt)}
                                                onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)}
                                            />
                                            <span className="text-slate-700 group-hover:text-slate-900 transition-colors">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {field.type === 'dropdown' && (
                                <select
                                    required={field.required}
                                    className="w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
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
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 transition-all duration-300">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                                            {answers[field.id] ? (
                                                 <p className="text-sm text-emerald-600 font-semibold">Image uploaded ✓</p>
                                            ) : (
                                                <p className="text-sm text-slate-500">Click to upload photo (max 5MB)</p>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden" 
                                            required={field.required && !answers[field.id]}
                                            onChange={e => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    handleFileUpload(field.id, e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                    {answers[field.id] && (
                                        <div className="mt-4">
                                            <img src={answers[field.id]} alt="Preview" className="w-24 h-24 object-cover rounded-2xl border border-gray-200 shadow-sm" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-200/60">
                        <span className="text-sm text-slate-400 font-semibold tracking-wide">Q-Swift Forms</span>
                        <Button 
                            type="submit" 
                            variant="gradient"
                            disabled={submitting}
                            isLoading={submitting}
                            className="w-32"
                        >
                            Submit
                        </Button>
                    </div>
                </form>
                </>
                )}
            </div>
        </div>
    );
}
