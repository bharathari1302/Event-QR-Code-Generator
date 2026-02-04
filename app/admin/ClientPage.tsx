'use client';

import { useState } from 'react';
import { FaCloudUploadAlt, FaFileExcel, FaSpinner } from 'react-icons/fa';

export default function AdminPage() {
    const [file, setFile] = useState<File | null>(null);
    const [eventName, setEventName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file || !eventName) {
            setStatus({ type: 'error', msg: 'Please select a file and enter an event name.' });
            return;
        }

        setUploading(true);
        setStatus({ type: '', msg: '' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventName', eventName);

        try {
            const res = await fetch('/api/participants/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Upload failed');

            setStatus({ type: 'success', msg: data.message });
            setFile(null);
            // Optional: Clear event name or keep it
        } catch (err: any) {
            setStatus({ type: 'error', msg: err.message });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

                <div className="space-y-6">
                    {/* Event Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                        <input
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="e.g. Annual Tech Symposium 2026"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">This name will appear on the Invitation PDF.</p>
                    </div>

                    {/* File Upload Area */}
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
                                    <span className="text-gray-700 font-medium">Click to upload Participant List</span>
                                    <span className="text-sm text-gray-500">Supported formats: .xlsx, .csv</span>
                                </>
                            )}
                        </label>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full py-3 px-6 rounded-lg text-white font-semibold flex items-center justify-center gap-2
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

                    {/* Send Emails Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Actions</h2>
                        <button
                            onClick={async () => {
                                setUploading(true);
                                setStatus({ type: '', msg: 'Sending emails... This may take a while.' });
                                try {
                                    const res = await fetch('/api/email/send', { method: 'POST' });
                                    const data = await res.json();
                                    setStatus({
                                        type: data.success ? 'success' : 'error',
                                        msg: data.message || (data.success ? 'Emails sent.' : 'No pending emails.')
                                    });
                                } catch (e: any) {
                                    setStatus({ type: 'error', msg: e.message });
                                } finally {
                                    setUploading(false);
                                }
                            }}
                            disabled={uploading}
                            className={`w-full py-3 px-6 rounded-lg text-white font-semibold flex items-center justify-center gap-2
                ${uploading ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all'}
              `}
                        >
                            {uploading ? <FaSpinner className="animate-spin" /> : 'Send Pending Invitations'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Processing up to 50 emails at a time. Click again if you have more.
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
