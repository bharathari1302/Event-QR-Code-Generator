'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaCloudUploadAlt, FaFileExcel, FaSpinner, FaArrowLeft, FaLink, FaCheck } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';

export default function ManageEventPage() {
    const { id: eventId } = useParams() as { id: string };
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [eventName, setEventName] = useState('Loading...');
    const [subEventName, setSubEventName] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [savingLink, setSavingLink] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });
    interface ProgressState { current: number; total: number; success: number; failed: number; }
    const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 1, success: 0, failed: 0 });

    // PDF Generation State
    const [pdfPurpose, setPdfPurpose] = useState<'event' | 'hostel'>('event');
    const [hostelSubType, setHostelSubType] = useState<'hostel_day' | 'other'>('hostel_day');
    const [customMealName, setCustomMealName] = useState('');
    const [venue, setVenue] = useState('');
    const [eventDate, setEventDate] = useState('');

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

            // Fetch drive folder link & event details if possible
            // Reusing the same endpoint as admin for drive folder
            fetch(`/api/events/drive-folder?eventId=${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.driveFolderLink) {
                        setDriveLink(data.driveFolderLink);
                    }
                })
                .catch(err => console.error('Failed to fetch drive link', err));

            // Also try to get event name (optional, if you have an endpoint)
            fetch(`/api/events/details?id=${eventId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.name) setEventName(data.name);
                })
                .catch(e => { });
        }
    }, [eventId, user]);

    const saveDriveFolder = async () => {
        if (!eventId) return;
        setSavingLink(true);
        try {
            const res = await fetch('/api/events/drive-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, driveUrl: driveLink })
            });
            const data = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', msg: data.message });
                setDriveLink(data.driveFolderLink || driveLink);
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
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setUploading(false);
        }
    };

    // Google Sheets State
    const [sheetId, setSheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [syncingSheet, setSyncingSheet] = useState(false);
    const [autoSendEmails, setAutoSendEmails] = useState(false);

    // ... (rest of Upload Logic)

    const handleSheetSync = async () => {
        if (!sheetId) {
            setStatus({ type: 'error', msg: 'Please enter a Google Sheet ID.' });
            return;
        }

        // Validate for Auto-Send
        if (autoSendEmails) {
            if (!venue || !eventDate) {
                setStatus({ type: 'error', msg: 'Venue and Date are required for Auto-Sending emails.' });
                return;
            }
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
                    eventName
                })
            });

            const data = await res.json();

            if (res.ok) {
                const count = data.count || 0;
                let successMsg = data.message;

                // 2. Auto-Send Emails if enabled and participants added
                if (autoSendEmails && count > 0) {
                    setStatus({ type: 'info', msg: `${successMsg} Sending emails...` });

                    // We trigger the email API. Since it streams, we await the initial connection.
                    // For full feedback, we might want to read the stream, but for "Auto-Send" convenience, 
                    // firing it and letting backend handle (or basic await) is acceptable for now to avoid complexity in this "Sync" handler.
                    // However, to ensure it actually starts processing, we await the fetch.

                    await fetch('/api/email/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventId,
                            venue,
                            eventDate,
                            pdfPurpose: 'event'
                        })
                    });

                    successMsg += ' Emails have been queued/sent.';
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">

                <div className="mb-6 flex items-center gap-4">
                    <Link href="/manager" className="text-gray-500 hover:text-gray-800">
                        <FaArrowLeft /> Back
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-gray-800 mb-2">Manage Event</h1>
                <p className="text-gray-500 mb-6">{eventName}</p>

                <div className="space-y-6">
                    {/* Sub-Event / Competition Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sub-Event / Competition Name (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Paper Presentation, Coding Context"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={subEventName}
                            onChange={(e) => setSubEventName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Use this if you are uploading participants for a specific competition within the symposium.
                        </p>
                    </div>

                    {/* Google Drive Photo Folder */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Google Drive Photo Folder Link
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLink className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={driveLink}
                                    onChange={(e) => setDriveLink(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={saveDriveFolder}
                                disabled={savingLink}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                            >
                                {savingLink ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                                Save
                            </button>
                        </div>
                        <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                            IMPORTANT: The folder must be shared as "Anyone with the link" (Public) for the system to access the photos.
                        </p>
                    </div>

                    {/* Import Section Tabs or Divider */}
                    <div className="border-t border-gray-100 pt-4">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Import Participants</h2>

                        {/* Option 1: Google Sheets */}
                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-bl-lg">LIVE SYNC</div>
                            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                <span className="text-xl">📊</span> Import from Google Sheets
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Sheet ID (from URL)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1BxiMVs0XRA5nFK..."
                                        value={sheetId}
                                        onChange={(e) => setSheetId(e.target.value)}
                                        className="w-full p-2 border border-green-200 rounded focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Sheet Name (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Form Responses 1"
                                        value={sheetName}
                                        onChange={(e) => setSheetName(e.target.value)}
                                        className="w-full p-2 border border-green-200 rounded focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Auto Send Email Checkbox */}
                            <div className="flex items-center gap-2 mb-4">
                                <input
                                    type="checkbox"
                                    id="autoSendInfo"
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                                    checked={autoSendEmails}
                                    onChange={(e) => setAutoSendEmails(e.target.checked)}
                                />
                                <label htmlFor="autoSendInfo" className="text-sm text-gray-700 select-none cursor-pointer">
                                    Automatically send email invitations to new participants found
                                </label>
                            </div>

                            {/* Conditional Venue/Date Inputs for Auto-Send */}
                            {autoSendEmails && (
                                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="text-xs font-bold text-green-800 uppercase mb-2">Required for Emails</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Main Auditorium"
                                                value={venue}
                                                onChange={(e) => setVenue(e.target.value)}
                                                className="w-full p-2 text-sm border border-green-200 rounded focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={eventDate}
                                                onChange={(e) => setEventDate(e.target.value)}
                                                className="w-full p-2 text-sm border border-green-200 rounded focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSheetSync}
                                disabled={syncingSheet}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                {syncingSheet ? <FaSpinner className="animate-spin" /> : 'Sync Now'}
                            </button>
                            <p className="text-xs text-green-700 mt-2">
                                * Ensure you shared the sheet with the Service Account email.
                            </p>
                        </div>

                        {/* Option 2: Excel Upload */}
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
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
                                        <FaFileExcel className="text-green-600 text-4xl mb-3" />
                                        <span className="text-gray-800 font-medium">{file.name}</span>
                                        <span className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCloudUploadAlt className="text-blue-500 text-5xl mb-3" />
                                        <span className="text-gray-700 font-medium">Or Upload Excel / CSV</span>
                                        <span className="text-sm text-gray-500">Supported formats: .xlsx, .csv</span>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Upload Button for File */}
                        {file && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className={`w-full mt-4 py-3 px-6 rounded-lg text-white font-semibold flex items-center justify-center gap-2
                    ${uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all'}
                    `}
                            >
                                {uploading ? (
                                    <>
                                        <FaSpinner className="animate-spin" /> Uploading...
                                    </>
                                ) : (
                                    'Upload & Generate Participants'
                                )}
                            </button>
                        )}
                    </div>

                    {/* Send Emails Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions</h2>

                        {/* PDF Generation Options */}
                        <div className="mb-6 space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-medium text-gray-700">Invitation Type:</h3>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="pdfPurpose"
                                        checked={pdfPurpose === 'event'}
                                        onChange={() => setPdfPurpose('event')}
                                        className="accent-blue-600"
                                    />
                                    <span>For Event (Symposium)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="pdfPurpose"
                                        checked={pdfPurpose === 'hostel'}
                                        onChange={() => setPdfPurpose('hostel')}
                                        className="accent-blue-600"
                                    />
                                    <span>For Hostel</span>
                                </label>
                            </div>

                            {/* Event Details Inputs */}
                            {pdfPurpose === 'event' && (
                                <div className="ml-6 space-y-3 border-l-2 border-blue-200 pl-4 mt-2">
                                    <h4 className="text-sm font-medium text-gray-600">Event Details:</h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Venue</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Main Auditorium"
                                                value={venue}
                                                onChange={(e) => setVenue(e.target.value)}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                            <input
                                                type="date"
                                                value={eventDate}
                                                onChange={(e) => setEventDate(e.target.value)}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Conditional Hostel Options */}
                            {pdfPurpose === 'hostel' && (
                                <div className="ml-6 space-y-3 border-l-2 border-gray-300 pl-4 mt-2">
                                    <h4 className="text-sm font-medium text-gray-600">Hostel Purpose:</h4>

                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="hostelSubType"
                                                checked={hostelSubType === 'hostel_day'}
                                                onChange={() => setHostelSubType('hostel_day')}
                                                className="accent-purple-600"
                                            />
                                            <span>For Hostel Day</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="hostelSubType"
                                                checked={hostelSubType === 'other'}
                                                onChange={() => setHostelSubType('other')}
                                                className="accent-purple-600"
                                            />
                                            <span>Other Purpose (Single Meal)</span>
                                        </label>
                                    </div>

                                    {/* Other Purpose Input */}
                                    {hostelSubType === 'other' && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Enter Meal Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Special Dinner"
                                                value={customMealName}
                                                onChange={(e) => setCustomMealName(e.target.value)}
                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Progress Bar UI */}
                        {uploading && status.type !== 'error' && (
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Sending Emails...</span>
                                    <span>{Math.round((progress.current / progress.total) * 100) || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 text-center">
                                    Processed {progress.current} of {progress.total} | Success: {progress.success} | Failed: {progress.failed}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={async () => {
                                // Validation
                                if (pdfPurpose === 'hostel' && hostelSubType === 'other' && !customMealName.trim()) {
                                    setStatus({ type: 'error', msg: 'Please enter a meal name for "Other Purpose".' });
                                    return;
                                }
                                if (pdfPurpose === 'event' && (!venue.trim() || !eventDate.trim())) {
                                    setStatus({ type: 'error', msg: 'Please enter Venue and Date for Event Invitation.' });
                                    return;
                                }

                                setUploading(true);
                                status.msg = ''; // Clear prev message
                                setStatus({ type: '', msg: '' });
                                setProgress({ current: 0, total: 100, success: 0, failed: 0 }); // Init with dummy total

                                try {
                                    const res = await fetch('/api/email/send', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            pdfPurpose,
                                            hostelSubType,
                                            customMealName,
                                            venue,
                                            eventDate
                                        })
                                    });

                                    if (!res.body) throw new Error('ReadableStream not supported.');

                                    const reader = res.body.getReader();
                                    const decoder = new TextDecoder();
                                    let buffer = '';

                                    while (true) {
                                        const { done, value } = await reader.read();
                                        if (done) break;

                                        const chunk = decoder.decode(value, { stream: true });
                                        buffer += chunk;

                                        const lines = buffer.split('\n');
                                        // Keep the last part in buffer (it might be incomplete)
                                        buffer = lines.pop() || '';

                                        for (const line of lines) {
                                            if (!line.trim()) continue;
                                            try {
                                                const data = JSON.parse(line);

                                                if (data.status === 'started') {
                                                    setProgress((prev: ProgressState) => ({ ...prev, total: data.total }));
                                                } else if (data.status === 'progress') {
                                                    setProgress((prev: ProgressState) => ({
                                                        ...prev,
                                                        current: data.processed,
                                                        total: data.total,
                                                        success: data.success,
                                                        failed: data.failed
                                                    }));
                                                } else if (data.status === 'completed') {
                                                    setStatus({ type: 'success', msg: data.message });
                                                } else if (data.error) {
                                                    throw new Error(data.error);
                                                }
                                            } catch (e) {
                                                console.error('Error parsing chunk', e);
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
                            className={`w-full py-3 px-6 rounded-lg text-white font-semibold flex items-center justify-center gap-2
                ${uploading ? 'bg-purple-200 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all'}
                `}
                        >
                            {uploading ? <FaSpinner className="animate-spin text-purple-600" /> : 'Send Pending Invitations'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Note: Emails are sent only to participants with status "Generated".
                        </p>
                    </div>


                    {/* Status Messages */}
                    {status.msg && (
                        <div className={`p-4 rounded-lg mt-4 ${status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                            {status.msg}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
