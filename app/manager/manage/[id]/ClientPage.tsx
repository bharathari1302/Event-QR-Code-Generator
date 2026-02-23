'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Save,
    Link as LinkIcon,
    RefreshCw,
    FileSpreadsheet,
    Upload,
    Code,
    Search,
    Users,
    Trash2,
    Mail,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    Filter,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';

const DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'MECH', 'IT', 'AI&ML', 'CIVIL', 'OTHER'];

export default function ManageEventPage() {
    const { id: eventId } = useParams() as { id: string };
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [eventName, setEventName] = useState('Loading...');
    const [subEventName, setSubEventName] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [sheetId, setSheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [savingLink, setSavingLink] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

    // PDF Generation State
    const [pdfPurpose, setPdfPurpose] = useState<'event' | 'hostel'>('hostel');
    const [hostelSubType, setHostelSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [customMealName, setCustomMealName] = useState('');
    const [venue, setVenue] = useState('');
    const [eventDate, setEventDate] = useState('');

    // Coordinator State
    const [coordinators, setCoordinators] = useState<any[]>([]);
    const [fetchingCoordinators, setFetchingCoordinators] = useState(true);
    const [searchRollNo, setSearchRollNo] = useState('');
    const [searchingUser, setSearchingUser] = useState(false);
    const [foundUser, setFoundUser] = useState<any>(null);
    const [addingCoordinator, setAddingCoordinator] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState('');

    // Participant State
    const [participants, setParticipants] = useState<any[]>([]);
    const [fetchingParticipants, setFetchingParticipants] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('ALL');
    const [showDetailedList, setShowDetailedList] = useState(false);

    // Progress State
    interface ProgressState { current: number; total: number; success: number; failed: number; }
    const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 1, success: 0, failed: 0 });

    const [refreshingPhotos, setRefreshingPhotos] = useState(false);
    const [autoSendEmails, setAutoSendEmails] = useState(false);
    const [syncingSheet, setSyncingSheet] = useState(false);

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

            // Fetch drive folder link & event details
            fetch(`/api/events/details?id=${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.name) setEventName(data.name);
                    if (data.driveFolderLink) setDriveLink(data.driveFolderLink);
                    if (data.sheetId) setSheetId(data.sheetId);
                    if (data.sheetName) setSheetName(data.sheetName);
                    if (data.subEventName) setSubEventName(data.subEventName);
                })
                .catch(e => { });

            fetchCoordinators();
            fetchParticipants();
        }
    }, [eventId, user]);

    const fetchCoordinators = async () => {
        setFetchingCoordinators(true);
        try {
            const res = await fetch(`/api/events/coordinators?eventId=${eventId}`);
            const data = await res.json();
            if (data.coordinators) setCoordinators(data.coordinators);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingCoordinators(false);
        }
    };

    const fetchParticipants = async () => {
        setFetchingParticipants(true);
        try {
            const res = await fetch(`/api/participants/list?eventId=${eventId}`);
            const data = await res.json();
            if (data.success) setParticipants(data.participants);
        } catch (e) {
            console.error(e);
        } finally {
            setFetchingParticipants(false);
        }
    };

    const handleSearchCoordinator = async () => {
        if (!searchRollNo) return;
        setSearchingUser(true);
        setFoundUser(null);
        try {
            const res = await fetch(`/api/users/find?rollNo=${searchRollNo}`);
            const data = await res.json();
            if (data.user) {
                setFoundUser({ ...data.user, source: 'database' });
            } else {
                // Try finding in participants
                const participant = participants.find(p => p.rollNo === searchRollNo);
                if (participant) {
                    setFoundUser({
                        rollNo: participant.rollNo,
                        name: participant.name,
                        department: participant.department || 'UNKNOWN',
                        email: participant.email,
                        source: 'participant'
                    });
                } else {
                    setStatus({ type: 'error', msg: 'User/Participant not found.' });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearchingUser(false);
        }
    };

    const handleAddCoordinator = async () => {
        if (!foundUser) return;
        setAddingCoordinator(true);
        try {
            const res = await fetch('/api/events/coordinators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    rollNo: foundUser.rollNo,
                    department: selectedDepartment || foundUser.department || 'UNKNOWN',
                    name: foundUser.name,
                    email: foundUser.email,
                    source: foundUser.source
                })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Coordinator added successfully.' });
                setFoundUser(null);
                setSearchRollNo('');
                fetchCoordinators();
            } else {
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
            const res = await fetch(`/api/events/coordinators?id=${coordinatorId}`, { method: 'DELETE' });
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Coordinator removed.' });
                fetchCoordinators();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdatePermission = async (id: string, allowedDepartments: string[]) => {
        try {
            const res = await fetch('/api/events/coordinators', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, allowedDepartments })
            });
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Permissions updated.' });
                fetchCoordinators();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleRefreshPhotos = async () => {
        setRefreshingPhotos(true);
        try {
            const res = await fetch(`/api/photos/refresh?eventId=${eventId}`, { method: 'POST' });
            const data = await res.json();
            setStatus({ type: res.ok ? 'success' : 'error', msg: data.message || data.error });
        } catch (e: any) {
            setStatus({ type: 'error', msg: e.message });
        } finally {
            setRefreshingPhotos(false);
        }
    };

    const saveSettings = async () => {
        setSavingLink(true);
        try {
            const res = await fetch('/api/events/details', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: eventId,
                    driveFolderLink: driveLink,
                    sheetId,
                    sheetName,
                    subEventName
                })
            });
            const data = await res.json();
            setStatus({ type: res.ok ? 'success' : 'error', msg: data.message || data.error });
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
        formData.append('subEventName', subEventName);

        try {
            const res = await fetch('/api/participants/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setStatus({ type: 'success', msg: data.message });
            setFile(null);
            fetchParticipants();
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

        setSyncingSheet(true);
        setStatus({ type: '', msg: '' });

        try {
            const res = await fetch('/api/participants/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sheetId,
                    sheetName,
                    eventId,
                    eventName
                })
            });

            const data = await res.json();
            if (res.ok) {
                const count = data.count || 0;
                let successMsg = data.message;

                if (autoSendEmails && count > 0) {
                    setStatus({ type: '', msg: `${successMsg} Sending emails...` });
                    await fetch('/api/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventId,
                            pdfPurpose: 'hostel', // Defaulting to hostel for manager
                            hostelSubType: 'hostel_day'
                        })
                    });
                    successMsg += ' Emails have been queued/sent.';
                }

                setStatus({ type: 'success', msg: successMsg });
                fetchParticipants();
            } else {
                setStatus({ type: 'error', msg: data.error });
            }
        } catch (error: any) {
            setStatus({ type: 'error', msg: 'Network Error: ' + error.message });
        } finally {
            setSyncingSheet(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-1 sm:px-0 pb-20 text-foreground">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/manager">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Event</h1>
                    <p className="text-muted-foreground text-sm">{eventName}</p>
                </div>
            </div>

            {/* Status Message */}
            {status.msg && (
                <div className={`p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    <div className="flex items-center gap-3">
                        {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-medium text-sm sm:text-base leading-tight">{status.msg}</span>
                    </div>
                    <button onClick={() => setStatus({ type: '', msg: '' })} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column: Settings & Imports */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Event Configuration */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-card-foreground">
                            <Save className="w-5 h-5 text-primary" /> Event Configuration
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Sub-Event Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Paper Presentation"
                                        className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                        value={subEventName}
                                        onChange={(e) => setSubEventName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Google Drive Folder</label>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
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

                            <div className="flex gap-3">
                                <Button onClick={saveSettings} disabled={savingLink} isLoading={savingLink} className="flex-1">
                                    Save Settings
                                </Button>
                                <Button variant="outline" onClick={handleRefreshPhotos} disabled={refreshingPhotos} isLoading={refreshingPhotos} className="flex-1">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh Photos
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Import Participants */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6 text-foreground">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" /> Import Participants
                        </h2>

                        <div className="space-y-6">
                            {/* Google Sheet Sync */}
                            <div className="bg-green-50/50 border border-green-100 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-green-800">Google Sheets Sync</h3>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium italic">LIVE FEED</span>
                                </div>

                                <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-green-300 text-green-600 focus:ring-green-500"
                                        checked={autoSendEmails}
                                        onChange={(e) => setAutoSendEmails(e.target.checked)}
                                    />
                                    Auto-send emails to new participants
                                </label>

                                <Button onClick={handleSheetSync} disabled={syncingSheet} isLoading={syncingSheet} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                    Sync Now
                                </Button>
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-border"></div>
                                <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase">Or Upload File</span>
                                <div className="flex-grow border-t border-border"></div>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
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

                    {/* Participant List */}
                    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-foreground">
                        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" /> Participant List
                                {participants.length > 0 && (
                                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                                        {participants.length} total
                                    </span>
                                )}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDetailedList(!showDetailedList)}
                            >
                                {showDetailedList ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                                {showDetailedList ? 'Hide List' : 'View List'}
                            </Button>
                        </div>

                        {showDetailedList && (
                            <div className="p-4 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
                                {/* Filters */}
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search name, roll no..."
                                            className="w-full pl-9 p-2 bg-background border border-input rounded-md text-sm"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            className="p-2 bg-background border border-input rounded-md text-sm outline-none"
                                            value={filterDept}
                                            onChange={(e) => setFilterDept(e.target.value)}
                                        >
                                            <option value="ALL">All Departments</option>
                                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto border border-border rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Roll No</th>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Department</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Emails sent</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {participants
                                                .filter(p => {
                                                    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.rollNo?.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const matchesDept = filterDept === 'ALL' || p.department === filterDept;
                                                    return matchesSearch && matchesDept;
                                                })
                                                .slice(0, 100)
                                                .map(p => (
                                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3 font-mono font-bold">{p.rollNo}</td>
                                                        <td className="px-4 py-3 text-muted-foreground">{p.name}</td>
                                                        <td className="px-4 py-3 text-muted-foreground">{p.department}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.status === 'Generated' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground">{p.emailSentCount || 0}</td>
                                                    </tr>
                                                ))}
                                            {participants.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                                                        No participants found for this event.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Coordinators & Actions */}
                <div className="space-y-6 text-foreground">
                    {/* Coordinator Management */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
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
                                        className="w-full pl-9 p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
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
                                        <p className="text-sm font-bold">{foundUser.rollNo}</p>
                                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{foundUser.name}</p>
                                        {foundUser.source === 'participant' && (
                                            <select
                                                value={selectedDepartment}
                                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                                className="mt-1 text-[10px] p-1 border rounded bg-white text-foreground"
                                            >
                                                <option value="">Select Dept</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <Button size="sm" onClick={handleAddCoordinator} disabled={addingCoordinator} isLoading={addingCoordinator} className="h-8">
                                        Add
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Coordinator List */}
                        <div className="space-y-3">
                            {fetchingCoordinators ? (
                                <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">Loading coordinators...</div>
                            ) : coordinators.length === 0 ? (
                                <p className="text-center py-4 text-xs text-muted-foreground italic border border-dashed rounded-lg">No coordinators assigned.</p>
                            ) : (
                                coordinators.map(c => (
                                    <div key={c.id} className="bg-muted/30 border border-border rounded-lg p-3 text-sm group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-bold block">{c.rollNo}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">{c.department}</span>
                                            </div>
                                            <button onClick={() => handleRemoveCoordinator(c.id)} className="text-red-400 hover:text-red-600 p-1 opacity-100 transition-opacity">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <select
                                            value={c.allowedDepartments.includes('ALL') ? 'ALL' : 'CUSTOM'}
                                            onChange={(e) => handleUpdatePermission(c.id, e.target.value === 'ALL' ? ['ALL'] : [c.department])}
                                            className="w-full p-1 text-[10px] bg-background border border-input rounded text-foreground"
                                        >
                                            <option value="ALL">All Departments</option>
                                            <option value="CUSTOM">Specific Dept Only</option>
                                        </select>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Email Selection & Sending */}
                    <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-purple-600" /> Invitation Actions
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-3">Token Configuration</label>
                                <div className="grid grid-cols-1 gap-2">
                                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                        <input
                                            type="radio"
                                            checked={hostelSubType === 'hostel_day'}
                                            onChange={() => setHostelSubType('hostel_day')}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm">Hostel Day (5 Meals)</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                        <input
                                            type="radio"
                                            checked={hostelSubType === 'other'}
                                            onChange={() => setHostelSubType('other')}
                                            className="text-purple-600"
                                        />
                                        <span className="text-sm">Single Meal Ticket</span>
                                    </label>
                                </div>
                            </div>

                            {hostelSubType === 'other' && (
                                <input
                                    type="text"
                                    placeholder="Meal Name (e.g. Special Dinner)"
                                    value={customMealName}
                                    onChange={(e) => setCustomMealName(e.target.value)}
                                    className="w-full p-2.5 bg-background border border-input rounded-md text-sm focus:ring-purple-500 focus:outline-none"
                                />
                            )}

                            <Button
                                onClick={async () => {
                                    if (hostelSubType === 'other' && !customMealName.trim()) {
                                        setStatus({ type: 'error', msg: 'Please enter a meal name.' });
                                        return;
                                    }
                                    setUploading(true);
                                    setStatus({ type: '', msg: '' });
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

                                        if (!res.body) throw new Error('Streaming not supported');
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
                                                const update = JSON.parse(line);
                                                if (update.status === 'progress') {
                                                    setProgress({ current: update.processed, total: update.total, success: update.success, failed: update.failed });
                                                } else if (update.status === 'completed') {
                                                    setStatus({ type: 'success', msg: update.message });
                                                    fetchParticipants();
                                                }
                                            }
                                        }
                                    } catch (e: any) {
                                        setStatus({ type: 'error', msg: e.message });
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                                isLoading={uploading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Send Pending Invitations
                            </Button>

                            {uploading && (
                                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100 animate-in fade-in">
                                    <div className="flex justify-between text-xs text-purple-700 mb-1">
                                        <span>Processing...</span>
                                        <span>{progress.current} / {progress.total}</span>
                                    </div>
                                    <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                                            style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <p className="text-[10px] text-muted-foreground text-center">
                                Only participants with "Generated" status will receive emails.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
