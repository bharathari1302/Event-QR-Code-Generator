'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Copy, CheckCircle2, Settings, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import FormBuilder from '@/app/components/ui/FormBuilder';

interface FormField {
    id: string;
    type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'file_upload';
    label: string;
    required: boolean;
    options?: string[];
    isCore?: boolean;
}

const DEFAULT_JOIN_FORM_TITLE = 'Student Directory Registration';
const DEFAULT_UPDATE_FORM_TITLE = 'Update Missing Details';

export default function FormsClientPage() {
    const { user, role, loading: authLoading, adminId } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [joinFormTitle, setJoinFormTitle] = useState(DEFAULT_JOIN_FORM_TITLE);
    const [updateFormTitle, setUpdateFormTitle] = useState(DEFAULT_UPDATE_FORM_TITLE);

    useEffect(() => {
        if (!authLoading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            } else {
                fetchConfig();
            }
        }
    }, [user, role, authLoading, router]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/student-form');
            const data = await res.json();

            if (data.success && data.config) {
                setFormFields(data.config.formFields || []);
                setJoinFormTitle(data.config.joinFormTitle || DEFAULT_JOIN_FORM_TITLE);
                setUpdateFormTitle(data.config.updateFormTitle || DEFAULT_UPDATE_FORM_TITLE);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/student-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formFields,
                    joinFormTitle: joinFormTitle.trim() || DEFAULT_JOIN_FORM_TITLE,
                    updateFormTitle: updateFormTitle.trim() || DEFAULT_UPDATE_FORM_TITLE,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setSaved(true);
                alert('Directory forms saved successfully.');
            } else {
                alert(data.error || 'Failed to save form settings');
            }
        } catch (e: any) {
            alert(e.message || 'Failed to save form settings');
        } finally {
            setSaving(false);
        }
    };

    const copyLink = async (path: string, label: string) => {
        if (!adminId) return;
        const link = `${window.location.origin}${path}/${adminId}`;

        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(link);
                alert(`${label} link copied.`);
                return;
            } catch {
                // fallback below
            }
        }

        prompt(`Copy this ${label.toLowerCase()} link:`, link);
    };

    if (loading || authLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Directory Forms</h1>
                    <p className="text-muted-foreground mt-1">Create forms, rename them, and copy links after saving.</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} disabled={saving}>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Form Settings
                </Button>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-5">
                <div>
                    <h2 className="text-xl font-bold mb-2">Form Names</h2>
                    <p className="text-sm text-muted-foreground mb-4">You can rename each form title like Google Forms.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">New Student Form Name</label>
                        <input
                            type="text"
                            className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                            value={joinFormTitle}
                            onChange={(e) => setJoinFormTitle(e.target.value)}
                            placeholder={DEFAULT_JOIN_FORM_TITLE}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Update Existing Student Form Name</label>
                        <input
                            type="text"
                            className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                            value={updateFormTitle}
                            onChange={(e) => setUpdateFormTitle(e.target.value)}
                            placeholder={DEFAULT_UPDATE_FORM_TITLE}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6">
                <h2 className="text-xl font-bold mb-4">Directory Form Builder</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Define the fields used in student forms. Roll No and Name stay mandatory.
                </p>
                <FormBuilder fields={formFields} onChange={setFormFields} />
            </div>

            {saved && adminId && (
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <h3 className="text-base font-semibold">Form Links</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Copy links from here after saving form settings.</p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            onClick={() => copyLink('/directory-join', 'New student form')}
                            className="justify-start"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            <span className="mr-2">New Student Form</span>
                            <Copy className="w-4 h-4 ml-auto" />
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => copyLink('/directory-update', 'Update student form')}
                            className="justify-start"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            <span className="mr-2">Update Existing Student Form</span>
                            <Copy className="w-4 h-4 ml-auto" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
