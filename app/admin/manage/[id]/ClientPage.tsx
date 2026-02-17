'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import {
    ArrowLeft,
    Link as LinkIcon,
    Save,
    FileSpreadsheet,
    Upload,
    Mail,
    CheckCircle2,
    AlertCircle,
    Loader2,
    UserPlus,
    Users,
    Trash2,
    Search
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

type Coordinator = {
    id: string; // The User ID
    rollNo: string;
    department: string;
    allowedDepartments: string[]; // e.g. ['CSE', 'ECE'] or ['ALL']
};

const DEPARTMENTS = [
    'CIVIL', 'ECE', 'EEE', 'AIDS', 'AIML', 'MECH', 'MTS', 'IT', 'CSE', 'CSD', 'AUTO', 'CHEM', 'FT', 'M.Sc', 'MBA'
];


export default function ManageEventPage() {
    const { id: eventId } = useParams() as { id: string };
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    // State
    const [file, setFile] = useState<File | null>(null);
    const [eventName, setEventName] = useState('Loading...');
    const [subEventName, setSubEventName] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [savingLink, setSavingLink] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

    // Sync State
    const [sheetId, setSheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [syncingSheet, setSyncingSheet] = useState(false);
    const [autoSendEmails, setAutoSendEmails] = useState(true);

    // Progress State
    interface ProgressState { current: number; total: number; success: number; failed: number; }
    const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 1, success: 0, failed: 0 });

    // PDF Generation State (Only Hostel/Meal supported now)
    const [pdfPurpose, setPdfPurpose] = useState<'hostel'>('hostel'); // Forced to hostel
    const [hostelSubType, setHostelSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [customMealName, setCustomMealName] = useState('');

    // Sync Specific Token Settings
    const [syncSubType, setSyncSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [syncMealName, setSyncMealName] = useState('');

    // Coordinator Management State
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [fetchingCoordinators, setFetchingCoordinators] = useState(false);
    const [searchRollNo, setSearchRollNo] = useState('');
    const [searchingUser, setSearchingUser] = useState(false);
    const [foundUser, setFoundUser] = useState<{ id?: string, rollNo: string, department: string, source?: 'user' | 'participant', name?: string } | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [addingCoordinator, setAddingCoordinator] = useState(false);


    // Email Progress State
    const [emailProgress, setEmailProgress] = useState<{ total: number, processed: number, success: number, failed: number } | null>(null);


    useEffect(() => {
        if (!authLoading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            }
        }
    }, [user, role, authLoading, router]);

    useEffect(() => {
        if (eventId && user) {
            setEventName(`Event ID: ${eventId}`);
            fetch(`/api/events/details?eventId=${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.driveFolderLink) setDriveLink(data.driveFolderLink);

                    // Also support legacy driveFolderId if link is missing
                    if (!data.driveFolderLink && data.driveFolderId) {
                        setDriveLink(`https://drive.google.com/drive/folders/${data.driveFolderId}`);
                    }

                    if (data.googleSheetId) setSheetId(data.googleSheetId);
                    if (data.googleSheetName) setSheetName(data.googleSheetName);
                    if (data.name) setEventName(data.name);
                    if (data.sub_event_name) setSubEventName(data.sub_event_name);

                    // Sync Settings
                    if (data.syncSubType) setSyncSubType(data.syncSubType);
                    if (data.syncMealName) setSyncMealName(data.syncMealName);
                })
                .catch(err => console.error('Failed to fetch event details', err));

            // Fetch Coordinators
            fetchCoordinators();
        }
    }, [eventId, user]);

    // Auto-clear error messages after 10 seconds
    useEffect(() => {
        if (status.msg && status.type === 'error') {
            const timer = setTimeout(() => {
                setStatus({ type: '', msg: '' });
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const fetchCoordinators = async () => {
        if (!eventId) return;
        setFetchingCoordinators(true);
        try {
            const res = await fetch(`/api/events/coordinators?eventId=${eventId}`);
            const data = await res.json();
            if (res.ok) setCoordinators(data);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingCoordinators(false);
        }
    };

    const handleSearchCoordinator = async () => {
        if (!searchRollNo.trim()) return;
        setSearchingUser(true);
        setFoundUser(null);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch(`/api/admin/users/search?rollNo=${searchRollNo}`);
            const data = await res.json();

            if (res.ok) {
                // Check if already added (only if user ID is known, i.e., source is 'user')
                // If source is participant, they don't have a user ID yet, so they can't be in coordinators list (which is based on users)
                if (data.source === 'user' && coordinators.some(c => c.id === data.id)) {
                    setStatus({ type: 'error', msg: 'Coordinator already added to this event.' });
                } else {
                    setFoundUser(data);
                    setSelectedDepartment(data.department || ''); // Pre-fill
                }
            } else {
                setStatus({ type: 'error', msg: data.error || 'Coordinator not found.' });
            }
        } catch (e) {
            setStatus({ type: 'error', msg: 'Search failed.' });
        } finally {
            setSearchingUser(false);
        }
    };

    const handleAddCoordinator = async () => {
        if (!foundUser || !eventId) return;
        setAddingCoordinator(true);

        try {
            let userId = foundUser.id;

            // If source is participant (sheet), create user first
            if (foundUser.source === 'participant') {
                if (!selectedDepartment) throw new Error('Please select a department.');

                const createRes = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'coordinator',
                        rollNo: foundUser.rollNo,
                        department: selectedDepartment
                    })
                });
                const createData = await createRes.json();

                if (!createRes.ok) {
                    throw new Error(createData.error || 'Failed to create coordinator account.');
                }

                // Fetch the new user to get ID
                const searchRes = await fetch(`/api/admin/users/search?rollNo=${foundUser.rollNo}`);
                const searchData = await searchRes.json();
                if (searchRes.ok && searchData.id) {
                    userId = searchData.id;
                } else {
                    throw new Error('Created user but failed to retrieve ID.');
                }
            }

            if (!userId) throw new Error('User ID missing.');

            const res = await fetch('/api/events/coordinators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    userId,
                    rollNo: foundUser.rollNo,
                    department: selectedDepartment || foundUser.department,
                    allowedDepartments: ['ALL'] // Default
                })
            });

            if (res.ok) {
                setStatus({ type: 'success', msg: 'Coordinator added successfully.' });
                setFoundUser(null);
                setSearchRollNo('');
                fetchCoordinators();
            } else {
                const data = await res.json();
                setStatus({ type: 'error', msg: data.error });
            }
        } catch (e: any) {
            setStatus({ type: 'error', msg: e.message });
        } finally {
            setAddingCoordinator(false);
        }
    };

    const handleRemoveCoordinator = async (coordinatorId: string) => {
        if (!confirm('Are you sure you want to remove this coordinator?')) return;

        try {
            const res = await fetch(`/api/events/coordinators?eventId=${eventId}&coordinatorId=${coordinatorId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setStatus({ type: 'success', msg: 'Coordinator removed.' });
                fetchCoordinators();
            } else {
                setStatus({ type: 'error', msg: 'Failed to remove.' });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdatePermission = async (coordinatorId: string, newAllowed: string[]) => {
        // Optimistic update
        const oldCoordinators = [...coordinators];
        setCoordinators(prev => prev.map(c =>
            c.id === coordinatorId ? { ...c, allowedDepartments: newAllowed } : c
        ));

        try {
            await fetch('/api/events/coordinators', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    coordinatorId,
                    allowedDepartments: newAllowed
                })
            });
        } catch (e) {
            // Revert on fail
            setCoordinators(oldCoordinators);
            setStatus({ type: 'error', msg: 'Failed to update permissions.' });
        }
    };


    const saveSettings = async () => {
        if (!eventId) return;
        setSavingLink(true);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch('/api/events/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    driveLink,
                    subEventName,
                    googleSheetId: sheetId,
                    googleSheetName: sheetName,
                    syncSubType,
                    syncMealName
                })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', msg: 'All settings saved successfully.' });
            } else {
                setStatus({ type: 'error', msg: data.error });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: error.message });
        } finally {
            setSavingLink(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !eventId) {
            setStatus({ type: 'error', msg: 'Please select a file.' });
            return;
        }

        setUploading(true);
        setStatus({ type: '', msg: '' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);
        formData.append('eventName', eventName);
        formData.append('subEventName', subEventName); // Pass sub-event name

        try {
            const res = await fetch('/api/participants/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setStatus({ type: 'success', msg: data.message });
            setFile(null);
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setUploading(false);
        }
    };

    const handleSheetSync = async () => {
        if (!sheetId) {
            setStatus({ type: 'error', msg: 'Please enter a Google Sheet ID.' });
            return;
        }

        if (autoSendEmails && syncSubType === 'other' && !syncMealName.trim()) {
            setStatus({ type: 'error', msg: 'Please enter a Meal Name for the auto-send tokens.' });
            return;
        }

        setSyncingSheet(true);
        setStatus({ type: '', msg: '' });

        try {
            // 1. Sync Data
            const res = await fetch('/api/participants/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetId,
                    sheetName, // Optional
                    eventId,
                    eventName,
                    syncSubType,
                    syncMealName
                })
            });

            const data = await res.json();

            if (res.ok) {
                const count = data.count || 0;
                let successMsg = data.message;

                // 2. Auto-Send Emails if enabled and participants added
                if (autoSendEmails && count > 0) {
                    setStatus({ type: 'success', msg: `${successMsg} Sending emails...` });
                    setEmailProgress({ total: count, processed: 0, success: 0, failed: 0 }); // Init

                    try {
                        const emailRes = await fetch('/api/email/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                eventId,
                                pdfPurpose: 'hostel',
                                hostelSubType: syncSubType,
                                customMealName: syncMealName
                            })
                        });

                        if (!emailRes.body) throw new Error('No response body from email service');

                        const reader = emailRes.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (!line.trim()) continue;
                                try {
                                    const update = JSON.parse(line);
                                    if (update.status === 'started' || update.status === 'progress') {
                                        setEmailProgress({
                                            total: update.total || 0,
                                            processed: update.processed || 0,
                                            success: update.success || 0,
                                            failed: update.failed || 0
                                        });
                                    } else if (update.status === 'completed') {
                                        successMsg += ' Emails Sent.';
                                    } else if (update.error) {
                                        console.error('Email Error:', update.error);
                                    }
                                } catch (e) {
                                    console.error('JSON Parse Error', e);
                                }
                            }
                        }
                    } catch (emailErr: any) {
                        console.error('Auto-send email failed', emailErr);
                        successMsg += ' But email sending failed.';
                    }
                }

                setStatus({ type: 'success', msg: successMsg });
            } else {
                setStatus({ type: 'error', msg: data.error });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: 'Network Error: ' + error.message });
        } finally {
            setSyncingSheet(false);
            setEmailProgress(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/events">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Manage Event</h1>
                    <p className="text-muted-foreground text-sm">{eventName}</p>
                </div>
            </div>

            {/* Status Message */}
            {status.msg && (
                <div className={`p-4 rounded-lg flex items-center gap-3 justify-between ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium">{status.msg}</span>
                    </div>
                    <button
                        onClick={() => setStatus({ type: '', msg: '' })}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label="Dismiss message"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Settings */}
                <div className="space-y-6 lg:col-span-2">

                    {/* Event Configuration */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-card-foreground">
                            <Save className="w-5 h-5 text-primary" /> Event Configuration
                        </h2>

                        <div className="space-y-4">
                            {/* General Settings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                                        Sub-Event Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Paper Presentation"
                                        className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                        value={subEventName}
                                        onChange={(e) => setSubEventName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                                        Google Drive Folder
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="https://drive.google.com..."
                                            className="w-full pl-9 p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                            value={driveLink}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border my-4 pt-4">
                                <h3 className="text-sm font-semibold text-foreground mb-3">Default Sheet Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Sheet ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1BxiM..."
                                            value={sheetId}
                                            onChange={(e) => setSheetId(e.target.value)}
                                            className="w-full p-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Sheet Name</label>
                                        <input
                                            type="text"
                                            placeholder="Form Responses 1"
                                            value={sheetName}
                                            onChange={(e) => setSheetName(e.target.value)}
                                            className="w-full p-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button onClick={saveSettings} disabled={savingLink} isLoading={savingLink} className="w-full">
                                Save All Settings
                            </Button>
                        </div>
                    </div>

                    {/* Import Participants */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-card-foreground">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" /> Import Participants
                        </h2>

                        <div className="space-y-6">
                            {/* Google Sheet Sync */}
                            <div className="bg-green-50/50 border border-green-100 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                        Google Sheets Sync
                                    </h3>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Recommended</span>
                                </div>

                                <p className="text-xs text-green-700 mb-4">
                                    Uses Sheet ID and Name from "Event Configuration" above.
                                </p>

                                <label className="flex items-center gap-2 text-sm text-foreground mb-4 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                        checked={autoSendEmails}
                                        onChange={(e) => setAutoSendEmails(e.target.checked)}
                                    />
                                    Auto-send emails to new participants
                                </label>

                                <Button
                                    onClick={handleSheetSync}
                                    disabled={syncingSheet}
                                    isLoading={syncingSheet}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                >
                                    Sync Now
                                </Button>

                                {syncingSheet && emailProgress && (
                                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-semibold text-purple-900">Sending Emails...</span>
                                            <span className="text-[10px] font-mono text-purple-700">
                                                {emailProgress.processed} / {emailProgress.total}
                                            </span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${(emailProgress.processed / Math.max(emailProgress.total, 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-purple-600">
                                            <span className="text-green-600 font-medium">Success: {emailProgress.success}</span>
                                            <span className="text-red-500 font-medium">Failed: {emailProgress.failed}</span>
                                        </div>
                                    </div>
                                )}

                                {autoSendEmails && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <label className="block text-xs font-semibold text-green-800 mb-2">Token Type for Auto-Send:</label>
                                        <div className="flex gap-4 mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="rounded-full text-green-600 focus:ring-green-500"
                                                    checked={syncSubType === 'hostel_day'}
                                                    onChange={() => setSyncSubType('hostel_day')}
                                                />
                                                <span className="text-sm text-green-900">Hostel Day (5 Meals)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    className="rounded-full text-green-600 focus:ring-green-500"
                                                    checked={syncSubType === 'other'}
                                                    onChange={() => setSyncSubType('other')}
                                                />
                                                <span className="text-sm text-green-900">Single Meal</span>
                                            </label>
                                        </div>

                                        {syncSubType === 'other' && (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Meal Name (e.g. Special Dinner)"
                                                    value={syncMealName}
                                                    onChange={(e) => setSyncMealName(e.target.value)}
                                                    className="w-full p-2 bg-white border border-green-200 rounded text-sm focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-border"></div>
                                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase">Or Upload File</span>
                                <div className="flex-grow border-t border-border"></div>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx, .csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                                    {file ? (
                                        <>
                                            <FileSpreadsheet className="text-green-600 w-8 h-8 mb-2" />
                                            <span className="font-medium text-foreground">{file.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="text-muted-foreground w-8 h-8 mb-2" />
                                            <span className="text-sm text-muted-foreground">Click to upload Excel / CSV</span>
                                        </>
                                    )}
                                </label>
                            </div>

                            {file && (
                                <Button onClick={handleUpload} disabled={uploading} isLoading={uploading} className="w-full">
                                    Upload & Process
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions & Coordinators */}
                <div className="space-y-6">
                    {/* Coordinator Management */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-card-foreground">
                            <Users className="w-5 h-5 text-blue-600" /> Event Coordinators
                        </h2>

                        {/* Add Coordinator */}
                        <div className="space-y-4 mb-8">
                            <label className="block text-sm font-medium text-muted-foreground">Add Coordinator</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Enter Roll No"
                                        value={searchRollNo}
                                        onChange={(e) => setSearchRollNo(e.target.value.toUpperCase())}
                                        className="w-full pl-9 p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchCoordinator()}
                                    />
                                </div>
                                <Button
                                    onClick={handleSearchCoordinator}
                                    disabled={searchingUser || !searchRollNo}
                                    isLoading={searchingUser}
                                    variant="outline"
                                    size="sm"
                                >
                                    Find
                                </Button>
                            </div>

                            {foundUser && (
                                <div className={`border p-3 rounded-lg flex items-center justify-between animate-in fade-in ${foundUser.source === 'participant' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
                                    }`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-sm font-bold ${foundUser.source === 'participant' ? 'text-amber-900' : 'text-blue-900'
                                                }`}>{foundUser.rollNo}</p>
                                            {foundUser.source === 'participant' && (
                                                <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">
                                                    From Sheet
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs ${foundUser.source === 'participant' ? 'text-amber-700' : 'text-blue-700'
                                            }`}>
                                            {foundUser.name ? `${foundUser.name} • ` : ''}{selectedDepartment || foundUser.department}
                                        </p>

                                        {/* Department Selector for Participants (since it might be missing or UNKNOWN) */}
                                        {foundUser.source === 'participant' && (
                                            <div className="mt-2">
                                                <select
                                                    value={selectedDepartment}
                                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                                    className="text-xs p-1 border rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                >
                                                    <option value="">Select Dept</option>
                                                    {DEPARTMENTS.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handleAddCoordinator}
                                        disabled={addingCoordinator}
                                        isLoading={addingCoordinator}
                                        className={`h-8 ${foundUser.source === 'participant'
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {foundUser.source === 'participant' ? 'Create & Add' : 'Add'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Coordinator List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground">Assigned Coordinators</h3>
                            {fetchingCoordinators ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">Loading...</div>
                            ) : coordinators.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm italic border border-dashed rounded-lg">
                                    No coordinators assigned.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {coordinators.map(c => (
                                        <div key={c.id} className="bg-muted/30 border border-border rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold block text-foreground">{c.rollNo}</span>
                                                    <span className="text-xs text-muted-foreground">{c.department}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCoordinator(c.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Allowed Departments */}
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground block mb-1">
                                                    Allowed Scans:
                                                </label>
                                                <select
                                                    value={c.allowedDepartments.includes('ALL') ? 'ALL' : 'CUSTOM'}
                                                    onChange={(e) => {
                                                        if (e.target.value === 'ALL') {
                                                            handleUpdatePermission(c.id, ['ALL']);
                                                        } else {
                                                            // Default logic when switching to custom? currently just empty or keep all?
                                                            // Let's just set to their own department initially or empty
                                                            handleUpdatePermission(c.id, [c.department]);
                                                        }
                                                    }}
                                                    className="w-full p-1.5 text-xs bg-background border border-input rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="ALL">All Departments</option>
                                                    <option value="CUSTOM">Specific Departments</option>
                                                </select>

                                                {!c.allowedDepartments.includes('ALL') && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {DEPARTMENTS.map(dept => {
                                                            const isAllowed = c.allowedDepartments.includes(dept);
                                                            return (
                                                                <button
                                                                    key={dept}
                                                                    onClick={() => {
                                                                        let newAllowed;
                                                                        if (isAllowed) {
                                                                            newAllowed = c.allowedDepartments.filter(d => d !== dept);
                                                                            // Prevent empty if needed, or allow empty
                                                                        } else {
                                                                            newAllowed = [...c.allowedDepartments, dept];
                                                                        }
                                                                        handleUpdatePermission(c.id, newAllowed);
                                                                    }}
                                                                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${isAllowed
                                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {dept}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-card-foreground">
                            <Mail className="w-5 h-5 text-purple-600" /> Actions
                        </h2>


                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Token Type</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                        <input
                                            type="radio"
                                            name="hostelSubType"
                                            checked={hostelSubType === 'hostel_day'}
                                            onChange={() => setHostelSubType('hostel_day')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm">Hostel Day (5 Meals)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                        <input
                                            type="radio"
                                            name="hostelSubType"
                                            checked={hostelSubType === 'other'}
                                            onChange={() => setHostelSubType('other')}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm">Other (Single Meal)</span>
                                    </label>
                                </div>
                            </div>

                            {hostelSubType === 'other' && (
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Meal Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Special Dinner"
                                        value={customMealName}
                                        onChange={(e) => setCustomMealName(e.target.value)}
                                        className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            )}

                            <Button
                                onClick={async () => {
                                    if (hostelSubType === 'other' && !customMealName.trim()) {
                                        setStatus({ type: 'error', msg: 'Please enter a meal name.' });
                                        return;
                                    }
                                    setUploading(true);
                                    setStatus({ type: '', msg: '' });
                                    setEmailProgress(null);

                                    try {
                                        const res = await fetch('/api/email/send', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                pdfPurpose: 'hostel',
                                                hostelSubType,
                                                customMealName,
                                                eventId
                                            })
                                        });

                                        if (!res.body) throw new Error('No response body');

                                        const reader = res.body.getReader();
                                        const decoder = new TextDecoder();
                                        let buffer = '';

                                        while (true) {
                                            const { done, value } = await reader.read();
                                            if (done) break;

                                            buffer += decoder.decode(value, { stream: true });
                                            const lines = buffer.split('\n');
                                            buffer = lines.pop() || ''; // Keep partial line

                                            for (const line of lines) {
                                                if (!line.trim()) continue;
                                                try {
                                                    const update = JSON.parse(line);

                                                    if (update.status === 'started' || update.status === 'progress') {
                                                        setEmailProgress({
                                                            total: update.total || 0,
                                                            processed: update.processed || 0,
                                                            success: update.success || 0,
                                                            failed: update.failed || 0
                                                        });
                                                    } else if (update.status === 'completed') {
                                                        setStatus({ type: 'success', msg: update.message });
                                                    } else if (update.error) {
                                                        setStatus({ type: 'error', msg: update.error });
                                                    }
                                                } catch (e) {
                                                    console.error('JSON Parse Error', e);
                                                }
                                            }
                                        }

                                    } catch (e: any) {
                                        setStatus({ type: 'error', msg: e.message });
                                    } finally {
                                        setUploading(false);
                                        setEmailProgress(null);
                                    }
                                }}
                                disabled={uploading}
                                isLoading={uploading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {uploading ? 'Sending...' : 'Send Token Emails'}
                            </Button>

                            {emailProgress && (
                                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-purple-900">Sending Emails...</span>
                                        <span className="text-xs font-mono text-purple-700">
                                            {emailProgress.processed} / {emailProgress.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-purple-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                        <div
                                            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${(emailProgress.processed / Math.max(emailProgress.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-purple-600">
                                        <span className="text-green-600 font-medium">Success: {emailProgress.success}</span>
                                        <span className="text-red-500 font-medium">Failed: {emailProgress.failed}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
