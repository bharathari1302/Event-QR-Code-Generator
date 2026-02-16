'use client';

import { useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function CoordinatorScannerPage() {
    const { user, role, department, loading, logout } = useAuth();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'coordinator') {
                router.push('/login');
            }
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        if (!scanning) return;

        const scanner = new Html5QrcodeScanner(
            'qr-reader',
            { fps: 10, qrbox: 250 },
            false
        );

        scanner.render(
            async (decodedText) => {
                try {
                    // Try to parse as JSON
                    let data;
                    try {
                        data = JSON.parse(decodedText);
                    } catch (parseError) {
                        // If it's not JSON, maybe it's just a Roll No
                        setError('Invalid QR Code format. Expected JSON with participant details.');
                        setScanResult(null);
                        scanner.clear();
                        setScanning(false);
                        return;
                    }

                    // Validate required fields
                    if (!data.rollNo || !data.eventId) {
                        setError('QR Code missing required fields (rollNo or eventId)');
                        setScanResult(null);
                        scanner.clear();
                        setScanning(false);
                        return;
                    }

                    // Verify the participant
                    const res = await fetch('/api/participants/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            rollNo: data.rollNo,
                            eventId: data.eventId,
                            coordinatorDept: department
                        })
                    });

                    const result = await res.json();

                    if (res.ok) {
                        setScanResult(result);
                        setError('');
                    } else {
                        setError(result.error || 'Verification failed');
                        setScanResult(null);
                    }
                } catch (err: any) {
                    setError('Error verifying participant: ' + err.message);
                    setScanResult(null);
                }

                scanner.clear();
                setScanning(false);
            },
            (errorMessage) => {
                // Ignore continuous scanning errors
            }
        );

        return () => {
            scanner.clear();
        };
    }, [scanning, department]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Event Scanner</h1>
                    <p className="text-gray-600 mb-6">Department: {department || 'N/A'}</p>

                    {!scanning ? (
                        <button
                            onClick={() => setScanning(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold text-lg shadow-md hover:shadow-lg transition-all"
                        >
                            Start Scanning
                        </button>
                    ) : (
                        <>
                            <div id="qr-reader" className="mb-4"></div>
                            <button
                                onClick={() => {
                                    setScanning(false);
                                    setScanResult(null);
                                    setError('');
                                }}
                                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                Stop Scanning
                            </button>
                        </>
                    )}

                    {/* Scan Result */}
                    {scanResult && (
                        <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                            <h3 className="text-xl font-bold text-green-800 mb-4">✓ Participant Verified</h3>
                            <div className="space-y-2 text-gray-700">
                                <p><span className="font-semibold">Name:</span> {scanResult.name}</p>
                                <p><span className="font-semibold">Roll No:</span> {scanResult.rollNo}</p>
                                <p><span className="font-semibold">Department:</span> {scanResult.department}</p>
                                <p><span className="font-semibold">Event:</span> {scanResult.eventName}</p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-6 p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                            <h3 className="text-xl font-bold text-red-800 mb-2">✗ Error</h3>
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={() => logout()}
                        className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
