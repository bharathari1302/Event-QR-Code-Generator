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
    Users,
    Trash2,
    Search,
    Code,
    Copy,
    RefreshCw,
    X,
    UserPlus
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

const DEPARTMENTS = [
    'CIVIL', 'ECE', 'EEE', 'AIDS', 'AIML', 'MECH', 'MTS', 'IT', 'CSE', 'CSD', 'AUTO', 'CHEM', 'FT', 'M.Sc', 'MBA'
];

type Coordinator = {
    id: string;
    rollNo: string;
    department: string;
    allowedDepartments: string[];
};

export default function ManageEventPage() {
    const { id: eventId } = useParams() as { id: string };
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    // Basic State
    const [file, setFile] = useState<File | null>(null);
    const [eventName, setEventName] = useState('Loading...');
    const [subEventName, setSubEventName] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [sheetId, setSheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [savingLink, setSavingLink] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

    // Sync State
    const [syncingSheet, setSyncingSheet] = useState(false);
    const [autoSendEmails, setAutoSendEmails] = useState(true);
    const [refreshingPhotos, setRefreshingPhotos] = useState(false);

    // PDF / Email State
    const [hostelSubType, setHostelSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [customMealName, setCustomMealName] = useState('');

    // Manual Email Trigger State
    const [manualRollNo, setManualRollNo] = useState('');
    const [manualStudent, setManualStudent] = useState<{ id: string, name: string, rollNo: string, email: string, department: string, status: string } | null>(null);
    const [searchingManualStudent, setSearchingManualStudent] = useState(false);
    const [sendingManualEmail, setSendingManualEmail] = useState(false);

    // Manual Add Participant State
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [newParticipant, setNewParticipant] = useState({
        name: '', email: '', rollNo: '', department: '', college: '',
        year: '', phone: '', roomNo: '', foodPreference: 'Veg'
    });

    // Sync-specific token settings
    const [syncSubType, setSyncSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [syncMealName, setSyncMealName] = useState('');

    // Email Progress
    const [emailProgress, setEmailProgress] = useState<{ total: number; processed: number; success: number; failed: number } | null>(null);
    const [emailErrors, setEmailErrors] = useState<string[]>([]);

    // Coordinator State
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [fetchingCoordinators, setFetchingCoordinators] = useState(false);
    const [searchRollNo, setSearchRollNo] = useState('');
    const [searchingUser, setSearchingUser] = useState(false);
    const [foundUser, setFoundUser] = useState<{ id?: string; rollNo: string; department: string; source?: 'user' | 'participant'; name?: string } | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [addingCoordinator, setAddingCoordinator] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user || (role !== 'manager' && role !== 'admin')) {
                router.push('/login');
            }
        }
    }, [user, role, authLoading, router]);

    useEffect(() => {
        if (eventId && user) {
            setEventName(`Event ID: ${eventId}`);

            fetch(`/api/events/details?id=${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.name) setEventName(data.name);
                    if (data.driveFolderLink) setDriveLink(data.driveFolderLink);
                    if (data.sheetId) setSheetId(data.sheetId);
                    if (data.sheetName) setSheetName(data.sheetName);
                    if (data.subEventName) setSubEventName(data.subEventName);
                    if (data.syncSubType) setSyncSubType(data.syncSubType);
                    if (data.syncMealName) setSyncMealName(data.syncMealName);
                })
                .catch(() => { });

            fetchCoordinators();
        }
    }, [eventId, user]);

    // Auto-clear error messages after 10s
    useEffect(() => {
        if (status.msg && status.type === 'error') {
            const timer = setTimeout(() => setStatus({ type: '', msg: '' }), 10000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const fetchCoordinators = async () => {
        if (!eventId) return;
        setFetchingCoordinators(true);
        try {
            const res = await fetch(`/api/events/coordinators?eventId=${eventId}`);
            const data = await res.json();
            if (res.ok) setCoordinators(data.coordinators ?? data);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingCoordinators(false);
        }
    };

    const handleRefreshPhotos = async () => {
        setRefreshingPhotos(true);
        try {
            const res = await fetch(`/api/debug/photos?refresh=true&eventId=${eventId}`);
            const data = await res.json();
            if (data.cacheStats) {
                const stats = data.cacheStats.folders?.find((f: any) => f.folderId === eventId) || data.cacheStats.folders?.[0];
                const count = stats?.size || 0;
                setStatus({ type: 'success', msg: `Photos Refreshed! Found ${count} photos in cache.` });
            } else {
                setStatus({ type: 'success', msg: 'Photo cache refreshed successfully.' });
            }
        } catch {
            setStatus({ type: 'error', msg: 'Failed to refresh photos.' });
        } finally {
            setRefreshingPhotos(false);
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
                if (data.source === 'user' && coordinators.some(c => c.id === data.id)) {
                    setStatus({ type: 'error', msg: 'Coordinator already added to this event.' });
                } else {
                    setFoundUser(data);
                    setSelectedDepartment(data.department || '');
                }
            } else {
                setStatus({ type: 'error', msg: data.error || 'Coordinator not found.' });
            }
        } catch {
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

            if (foundUser.source === 'participant') {
                if (!selectedDepartment) throw new Error('Please select a department.');

                const createRes = await fetch('/api/admin/users/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'coordinator', rollNo: foundUser.rollNo, department: selectedDepartment })
                });
                const createData = await createRes.json();
                if (!createRes.ok) throw new Error(createData.error || 'Failed to create coordinator account.');

                const searchRes = await fetch(`/api/admin/users/search?rollNo=${foundUser.rollNo}`);
                const searchData = await searchRes.json();
                if (searchRes.ok && searchData.id) userId = searchData.id;
                else throw new Error('Created user but failed to retrieve ID.');
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
                    allowedDepartments: ['ALL']
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
            const res = await fetch(`/api/events/coordinators?eventId=${eventId}&coordinatorId=${coordinatorId}`, { method: 'DELETE' });
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
        const oldCoordinators = [...coordinators];
        setCoordinators(prev => prev.map(c => c.id === coordinatorId ? { ...c, allowedDepartments: newAllowed } : c));
        try {
            await fetch('/api/events/coordinators', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, coordinatorId, allowedDepartments: newAllowed })
            });
        } catch {
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
            setStatus({ type: res.ok ? 'success' : 'error', msg: res.ok ? 'All settings saved successfully.' : data.error });
        } catch (error: any) {
            setStatus({ type: 'error', msg: error.message });
        } finally {
            setSavingLink(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file || !eventId) { setStatus({ type: 'error', msg: 'Please select a file.' }); return; }
        setUploading(true);
        setStatus({ type: '', msg: '' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);
        formData.append('eventName', eventName);
        formData.append('subEventName', subEventName);
        try {
            const res = await fetch('/api/participants/upload', { method: 'POST', body: formData });
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

    // --- EMAIL BATCH SEQUENCE ---
    const runEmailBatchSequence = async (subType: string, mealName: string) => {
        let hasMore = true;
        let cumulativeSuccess = 0;
        let cumulativeFailed = 0;

        while (hasMore) {
            let retryCount = 0;
            const MAX_RETRIES = 3;
            let successInThisBatch = false;

            while (retryCount < MAX_RETRIES && !successInThisBatch) {
                try {
                    const res = await fetch('/api/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventId,
                            pdfPurpose: 'hostel',
                            hostelSubType: subType,
                            customMealName: mealName
                        })
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
                        throw new Error(errorData.error || `Server returned ${res.status}`);
                    }

                    if (!res.body) throw new Error('No response body from email service');

                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let batchHasMore = false;

                    while (true) {
                        try {
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
                                        const currentTotal = update.absoluteTotal || update.total || 0;
                                        const batchProcessed = update.processed || 0;
                                        const batchSuccess = update.success || 0;
                                        const batchFailed = update.failed || 0;

                                        setEmailProgress({
                                            total: currentTotal,
                                            processed: cumulativeSuccess + cumulativeFailed + batchProcessed,
                                            success: cumulativeSuccess + batchSuccess,
                                            failed: cumulativeFailed + batchFailed
                                        });
                                    } else if (update.status === 'completed') {
                                        cumulativeSuccess += update.success || 0;
                                        cumulativeFailed += update.failed || 0;
                                        batchHasMore = update.hasMore;
                                        successInThisBatch = true; // We finished the stream!
                                    } else if (update.status === 'error') {
                                        setEmailErrors(prev => [...prev, update.error]);
                                    }
                                } catch (e) { console.error('JSON Parse Error', e); }
                            }
                        } catch (readErr: any) {
                            console.error('Stream read error:', readErr);
                            throw new Error(`Stream interrupted: ${readErr.message}`);
                        }
                    }

                    hasMore = batchHasMore;

                } catch (err: any) {
                    retryCount++;
                    console.error(`Email batch attempt ${retryCount} failed:`, err);

                    if (retryCount < MAX_RETRIES) {
                        setStatus({ type: 'error', msg: `Connection lag... Retrying attempt ${retryCount + 1}/3` });
                        // Wait 2 seconds before retry
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        setEmailErrors(prev => [...prev, `Batch sequence stopped after ${MAX_RETRIES} attempts: ${err.message}`]);
                        hasMore = false;
                    }
                }
            }
        }

        return { success: cumulativeSuccess, failed: cumulativeFailed };
    };

    const handleSheetSync = async () => {
        if (!sheetId) { setStatus({ type: 'error', msg: 'Please configure a Sheet ID in Event Configuration first.' }); return; }
        if (autoSendEmails && syncSubType === 'other' && !syncMealName.trim()) {
            setStatus({ type: 'error', msg: 'Please enter a Meal Name for auto-send tokens.' });
            return;
        }
        setSyncingSheet(true);
        setStatus({ type: '', msg: '' });
        setEmailErrors([]);

        try {
            const res = await fetch('/api/participants/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetId, sheetName, eventId, eventName, syncSubType, syncMealName })
            });
            const data = await res.json();

            if (res.ok) {
                const count = data.count || 0;
                const totalRows = data.totalRows || 0;
                const skippedNoName = data.skippedNoName || 0;
                const skippedDuplicate = data.skippedDuplicate || 0;

                let successMsg = `Synced ${count} participants from ${totalRows} rows.`;
                const skippedParts: string[] = [];
                if (skippedDuplicate > 0) skippedParts.push(`${skippedDuplicate} duplicates`);
                if (skippedNoName > 0) skippedParts.push(`${skippedNoName} missing name`);
                if (skippedParts.length > 0) successMsg += ` Skipped: ${skippedParts.join(', ')}.`;

                if (autoSendEmails && count > 0) {
                    setStatus({ type: 'success', msg: `${successMsg} Sending emails...` });
                    setEmailProgress({ total: count, processed: 0, success: 0, failed: 0 }); // Initial estimate

                    const { success, failed } = await runEmailBatchSequence(syncSubType, syncMealName);
                    successMsg += ` ✉ Sent: ${success}, Failed: ${failed}.`;

                    // Keep final email progress visible
                    setEmailProgress({
                        total: success + failed,
                        processed: success + failed,
                        success: success,
                        failed: failed
                    });
                }

                setStatus({ type: 'success', msg: successMsg });
            } else {
                setStatus({ type: 'error', msg: data.error });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: 'Network Error: ' + error.message });
        } finally {
            setSyncingSheet(false);
        }
    };

    const handleSearchManualStudent = async () => {
        if (!manualRollNo.trim()) return;
        setSearchingManualStudent(true);
        setManualStudent(null);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch(`/api/participants/search?eventId=${eventId}&rollNo=${manualRollNo.trim()}`);
            const data = await res.json();

            if (res.ok) {
                setManualStudent(data);
            } else {
                setStatus({ type: 'error', msg: data.error || 'Student not found in this event.' });
            }
        } catch (e: any) {
            setStatus({ type: 'error', msg: 'Search failed.' });
        } finally {
            setSearchingManualStudent(false);
        }
    };

    const handleSendManualEmail = async () => {
        if (!manualStudent) return;
        setSendingManualEmail(true);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    pdfPurpose: 'hostel',
                    hostelSubType: syncSubType,
                    customMealName: syncMealName,
                    targetRollNo: manualStudent.rollNo
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to send email');
            }

            // Since it's a stream, read until complete.
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let success = false;
            let errorMessage = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const update = JSON.parse(line);
                            if (update.status === 'completed') {
                                success = (update.success || 0) > 0;
                            } else if (update.status === 'error') {
                                errorMessage = update.error;
                            }
                        } catch (e) { }
                    }
                }
            }

            if (success) {
                setStatus({ type: 'success', msg: `Email successfully sent to ${manualStudent.name} (${manualStudent.email})` });
                // Reset states
                setManualStudent(null);
                setManualRollNo('');
            } else {
                setStatus({ type: 'error', msg: errorMessage || 'Failed to send email.' });
            }

        } catch (error: any) {
            setStatus({ type: 'error', msg: error.message });
        } finally {
            setSendingManualEmail(false);
        }
    };

    const handleAddParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingParticipant(true);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch('/api/participants/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    eventName,
                    subEventName,
                    ...newParticipant
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({
                    type: 'success',
                    msg: data.type === 'updated'
                        ? `Participant ${newParticipant.name} updated successfully!`
                        : `Participant ${newParticipant.name} added successfully!`
                });

                // Reset form
                setNewParticipant({
                    name: '', email: '', rollNo: '', department: '', college: '',
                    year: '', phone: '', roomNo: '', foodPreference: 'Veg'
                });
            } else {
                setStatus({ type: 'error', msg: data.error || 'Failed to add participant.' });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: 'Network error: ' + error.message });
        } finally {
            setAddingParticipant(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-1 sm:px-0 pb-12 text-foreground">
            {/* ── Page Header ── */}
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-border">
                <Link href="/manager/events">
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">Manage Event</h1>
                    <p className="text-muted-foreground text-sm truncate">{eventName}</p>
                </div>
            </div>

            {/* ── Status Banner ── */}
            {status.msg && (
                <div className={`flex items-start gap-3 justify-between p-4 rounded-xl border mb-5 animate-in fade-in slide-in-from-top-2 ${status.type === 'success'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {status.type === 'success'
                            ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
                            : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />}
                        <span className="text-sm font-medium leading-snug">{status.msg}</span>
                    </div>
                    <button onClick={() => setStatus({ type: '', msg: '' })} className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">

                {/* ── Left Column ── */}
                <div className="space-y-5 xl:col-span-2">

                    {/* ① Event Configuration */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                            <Save className="w-4 h-4 text-primary" />
                            <h2 className="text-sm font-semibold text-card-foreground">Event Configuration</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sub-Event Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Paper Presentation"
                                        className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                        value={subEventName}
                                        onChange={(e) => setSubEventName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Google Drive Folder</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="https://drive.google.com..."
                                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                            value={driveLink}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Google Sheet (Default)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sheet ID</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1BxiM..."
                                            value={sheetId}
                                            onChange={(e) => setSheetId(e.target.value)}
                                            className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sheet Name</label>
                                        <input
                                            type="text"
                                            placeholder="Form Responses 1"
                                            value={sheetName}
                                            onChange={(e) => setSheetName(e.target.value)}
                                            className="w-full px-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                <Button onClick={saveSettings} disabled={savingLink} isLoading={savingLink} className="flex-1">
                                    Save All Settings
                                </Button>
                                <Button variant="outline" onClick={handleRefreshPhotos} disabled={refreshingPhotos} isLoading={refreshingPhotos} className="flex-1">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh Photos
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ② Import Participants */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10 text-green-600 text-xs font-bold">2</span>
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            <h2 className="text-sm font-semibold text-card-foreground">Import Participants</h2>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Google Sheet Sync */}
                            <div className="bg-green-50/60 border border-green-100 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-green-800 text-sm">Google Sheets Sync</h3>
                                    <span className="text-xs bg-green-200 text-green-800 px-2.5 py-0.5 rounded-full font-semibold">Recommended</span>
                                </div>
                                <p className="text-xs text-green-700 mb-4">Uses Sheet ID and Name configured in Event Configuration above.</p>

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

                                {emailProgress && (
                                    <div className={`mt-4 p-3 rounded-lg border animate-in fade-in ${!syncingSheet ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-100'}`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`text-xs font-semibold ${!syncingSheet ? 'text-green-900' : 'text-purple-900'}`}>
                                                {!syncingSheet ? '✅ Email Summary' : 'Sending Emails...'}
                                            </span>
                                            <span className="text-[10px] font-mono text-purple-700">{emailProgress.processed} / {emailProgress.total}</span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${(emailProgress.processed / Math.max(emailProgress.total, 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-green-600 font-medium">✅ Sent: {emailProgress.success}</span>
                                            <span className="text-red-500 font-medium">❌ Failed: {emailProgress.failed}</span>
                                        </div>
                                    </div>
                                )}

                                {emailErrors.length > 0 && (
                                    <div className="mt-2 max-h-40 overflow-y-auto p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-600 font-mono">
                                        <p className="font-bold mb-1 uppercase">Error Log:</p>
                                        {emailErrors.map((err, i) => (
                                            <div key={i} className="mb-1 border-b border-red-100 pb-1 last:border-0">• {err}</div>
                                        ))}
                                    </div>
                                )}

                                {autoSendEmails && (
                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <label className="block text-xs font-semibold text-green-800 mb-2">Token Type for Auto-Send:</label>
                                        <div className="flex gap-4 mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" className="text-green-600 focus:ring-green-500" checked={syncSubType === 'hostel_day'} onChange={() => setSyncSubType('hostel_day')} />
                                                <span className="text-sm text-green-900">Hostel Day (5 Meals)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" className="text-green-600 focus:ring-green-500" checked={syncSubType === 'other'} onChange={() => setSyncSubType('other')} />
                                                <span className="text-sm text-green-900">Single Meal</span>
                                            </label>
                                        </div>
                                        {syncSubType === 'other' && (
                                            <input
                                                type="text"
                                                placeholder="Meal Name (e.g. Special Dinner)"
                                                value={syncMealName}
                                                onChange={(e) => setSyncMealName(e.target.value)}
                                                className="w-full p-2 bg-white border border-green-200 rounded text-sm focus:border-green-500 focus:outline-none"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="relative flex items-center py-1">
                                <div className="flex-grow border-t border-border" />
                                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-widest">Or Upload File</span>
                                <div className="flex-grow border-t border-border" />
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/40 transition-colors cursor-pointer">
                                <input type="file" accept=".xlsx, .csv" onChange={handleFileChange} className="hidden" id="file-upload" />
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

                    {/* ③ Manual Student Entry */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">3</span>
                            <UserPlus className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-semibold text-card-foreground">Manual Student Entry</h2>
                        </div>
                        <div className="p-5">
                            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 mb-4">
                                <p className="text-sm text-emerald-800">
                                    Add a single participant directly to the database. If the email or Roll No exactly matches an existing record, it will update them instead.
                                </p>
                            </div>

                            <form onSubmit={handleAddParticipant} className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Full Name *', key: 'name', type: 'text', required: true },
                                        { label: 'Email Address *', key: 'email', type: 'email', required: true },
                                        { label: 'Roll No', key: 'rollNo', type: 'text' },
                                        { label: 'Department', key: 'department', type: 'text' },
                                        { label: 'Phone', key: 'phone', type: 'text' },
                                        { label: 'Room No', key: 'roomNo', type: 'text' },
                                        { label: 'College', key: 'college', type: 'text' },
                                        { label: 'Year', key: 'year', type: 'text' },
                                    ].map(({ label, key, type, required }) => (
                                        <div key={key}>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</label>
                                            <input
                                                required={required}
                                                type={type}
                                                value={(newParticipant as any)[key]}
                                                onChange={(e) => setNewParticipant({ ...newParticipant, [key]: e.target.value })}
                                                className="w-full px-3 py-2.5 text-sm bg-background border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Food Preference</label>
                                        <select
                                            value={newParticipant.foodPreference}
                                            onChange={(e) => setNewParticipant({ ...newParticipant, foodPreference: e.target.value })}
                                            className="w-full px-3 py-2.5 text-sm bg-background border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                                        >
                                            <option value="Veg">Veg</option>
                                            <option value="Non Veg">Non-Veg</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-900 mb-1">Room No (Optional)</label>
                                        <input type="text" value={newParticipant.roomNo} onChange={(e) => setNewParticipant({ ...newParticipant, roomNo: e.target.value })} className="w-full p-2 bg-white border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-900 mb-1">College (Optional)</label>
                                        <input type="text" value={newParticipant.college} onChange={(e) => setNewParticipant({ ...newParticipant, college: e.target.value })} className="w-full p-2 bg-white border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-900 mb-1">Year (Optional)</label>
                                        <input type="text" value={newParticipant.year} onChange={(e) => setNewParticipant({ ...newParticipant, year: e.target.value })} className="w-full p-2 bg-white border border-emerald-200 rounded text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="submit"
                                        disabled={addingParticipant || !newParticipant.name || !newParticipant.email}
                                        isLoading={addingParticipant}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" /> Add Participant
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* ⑤ Manual Email Sender */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-bold">4</span>
                            <Mail className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-semibold text-card-foreground">Manual Target Email Sender</h2>
                        </div>
                        <div className="p-5">
                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 mb-4">
                                <p className="text-sm text-indigo-800">
                                    Search a student&apos;s Roll No to re-send their invitation email individually.
                                </p>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Enter Roll No"
                                        value={manualRollNo}
                                        onChange={(e) => setManualRollNo(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchManualStudent()}
                                        className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                    />
                                </div>
                                <Button
                                    onClick={handleSearchManualStudent}
                                    disabled={searchingManualStudent || !manualRollNo}
                                    isLoading={searchingManualStudent}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5"
                                >
                                    Search
                                </Button>
                            </div>

                            {manualStudent && (
                                <div className="border border-indigo-200 bg-white p-4 rounded-xl animate-in zoom-in-95">
                                    <div className="mb-3">
                                        <h4 className="font-bold text-indigo-900 text-sm">{manualStudent.name}</h4>
                                        <p className="text-xs text-muted-foreground">{manualStudent.rollNo} &bull; {manualStudent.department}</p>
                                    </div>
                                    <div className="mb-4 space-y-1">
                                        <p className="text-sm"><span className="font-medium">Email:</span> {manualStudent.email || 'Not provided'}</p>
                                        <p className="text-sm"><span className="font-medium">Status:</span> {manualStudent.status}</p>
                                    </div>
                                    <Button
                                        onClick={handleSendManualEmail}
                                        disabled={sendingManualEmail || !manualStudent.email}
                                        isLoading={sendingManualEmail}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        <Mail className="w-4 h-4 mr-2" /> Send Invitation Email
                                    </Button>
                                    {!manualStudent.email && (
                                        <p className="text-xs text-red-500 mt-2 text-center">Cannot send email: No email address on file.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ⑥ Real-Time Sync (Apps Script) */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold">5</span>
                            <Code className="w-4 h-4 text-amber-600" />
                            <h2 className="text-sm font-semibold text-card-foreground">Real-Time Sync (Google Apps Script)</h2>
                        </div>
                        <div className="p-5">
                            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 mb-5">
                                <p className="text-sm text-amber-800">
                                    To get real-time updates from your Google Sheet, add the provided script and configure these values:
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-amber-900 uppercase tracking-wider block mb-1.5">Webhook URL</label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-mono text-amber-800 overflow-x-auto whitespace-nowrap">
                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/participants` : '/api/webhooks/participants'}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 border-amber-200 hover:bg-amber-100 text-amber-800"
                                            onClick={() => {
                                                if (typeof window !== 'undefined') {
                                                    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/participants`);
                                                    setStatus({ type: 'success', msg: 'Webhook URL copied!' });
                                                }
                                            }}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-amber-900 uppercase tracking-wider block mb-1.5">Event ID</label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-mono text-amber-800">
                                            {eventId}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 border-amber-200 hover:bg-amber-100 text-amber-800"
                                            onClick={() => {
                                                navigator.clipboard.writeText(eventId);
                                                setStatus({ type: 'success', msg: 'Event ID copied!' });
                                            }}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column (Sticky) ── */}
                <div className="space-y-5 xl:sticky xl:top-4 xl:self-start">
                    {/* Coordinator Management */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <Users className="w-4 h-4 text-blue-600" />
                            <h2 className="text-sm font-semibold text-card-foreground">Event Coordinators</h2>
                        </div>
                        <div className="p-5">
                            {/* Add Coordinator */}
                            <div className="space-y-3 mb-6">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Coordinator by Roll No</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Enter Roll No"
                                            value={searchRollNo}
                                            onChange={(e) => setSearchRollNo(e.target.value.toUpperCase())}
                                            className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchCoordinator()}
                                        />
                                    </div>
                                    <Button onClick={handleSearchCoordinator} disabled={searchingUser || !searchRollNo} isLoading={searchingUser} variant="outline" size="sm">
                                        Find
                                    </Button>
                                </div>

                                {foundUser && (
                                    <div className={`border p-3 rounded-lg flex items-center justify-between animate-in zoom-in-95 ${foundUser.source === 'participant' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-bold ${foundUser.source === 'participant' ? 'text-amber-900' : 'text-blue-900'}`}>
                                                    {foundUser.rollNo}
                                                </p>
                                                {foundUser.source === 'participant' && (
                                                    <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">From Sheet</span>
                                                )}
                                            </div>
                                            <p className={`text-xs ${foundUser.source === 'participant' ? 'text-amber-700' : 'text-blue-700'}`}>
                                                {foundUser.name ? `${foundUser.name} • ` : ''}{selectedDepartment || foundUser.department}
                                            </p>
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
                                            className={`h-8 ${foundUser.source === 'participant' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
                                    <div className="text-center py-4 text-muted-foreground text-sm animate-pulse">Loading...</div>
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
                                                    <button onClick={() => handleRemoveCoordinator(c.id)} className="text-red-500 hover:text-red-700 p-1" title="Remove">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground block mb-1">Allowed Scans:</label>
                                                    <select
                                                        value={c.allowedDepartments.includes('ALL') ? 'ALL' : 'CUSTOM'}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'ALL') handleUpdatePermission(c.id, ['ALL']);
                                                            else handleUpdatePermission(c.id, [c.department]);
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
                                                                            const newAllowed = isAllowed
                                                                                ? c.allowedDepartments.filter(d => d !== dept)
                                                                                : [...c.allowedDepartments, dept];
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
                    </div>

                    {/* Send Token Emails (Actions) */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                            <Mail className="w-4 h-4 text-purple-600" />
                            <h2 className="text-sm font-semibold text-card-foreground">Send Token Emails</h2>
                        </div>

                        <div className="p-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Token Type</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                            <input type="radio" name="hostelSubType" checked={hostelSubType === 'hostel_day'} onChange={() => setHostelSubType('hostel_day')} className="text-purple-600 focus:ring-purple-500" />
                                            <span className="text-sm">Hostel Day (5 Meals)</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                            <input type="radio" name="hostelSubType" checked={hostelSubType === 'other'} onChange={() => setHostelSubType('other')} className="text-purple-600 focus:ring-purple-500" />
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
                                        setEmailErrors([]);
                                        try {
                                            const res = await fetch('/api/email/send', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ pdfPurpose: 'hostel', hostelSubType, customMealName, eventId })
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
                                                buffer = lines.pop() || '';
                                                for (const line of lines) {
                                                    if (!line.trim()) continue;
                                                    try {
                                                        const update = JSON.parse(line);
                                                        if (update.status === 'started' || update.status === 'progress') {
                                                            setEmailProgress({ total: update.total || 0, processed: update.processed || 0, success: update.success || 0, failed: update.failed || 0 });
                                                        } else if (update.status === 'completed') {
                                                            setStatus({ type: 'success', msg: update.message });
                                                        } else if (update.status === 'error') {
                                                            setEmailErrors(prev => [...prev, update.error]);
                                                        }
                                                    } catch { }
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
                                            <span className="text-xs font-mono text-purple-700">{emailProgress.processed} / {emailProgress.total}</span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-2.5 mb-2 overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${(emailProgress.processed / Math.max(emailProgress.total, 1)) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-green-600 font-medium">Success: {emailProgress.success}</span>
                                            <span className="text-red-500 font-medium">Failed: {emailProgress.failed}</span>
                                        </div>
                                    </div>
                                )}

                                {emailErrors.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg max-h-48 overflow-y-auto">
                                        <h4 className="text-xs font-bold text-red-700 uppercase mb-2">Error Details</h4>
                                        <div className="space-y-2">
                                            {emailErrors.map((err, i) => (
                                                <div key={i} className="text-[10px] text-red-600 font-mono bg-white p-2 rounded border border-red-50 leading-relaxed">{err}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
