'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaQrcode } from 'react-icons/fa';

type ScanResult = {
    valid: boolean;
    status: 'verified' | 'used' | 'invalid' | 'error';
    participant?: {
        name: string;
        college: string;
        event_name: string;
        ticket_id: string;
        rollNo?: string;
        photoUrl?: string | null;
        check_in_time?: string;
    };
    message?: string;
};

export default function CoordinatorPage() {
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanning, setScanning] = useState(true);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize Scanner
        if (!scanResult && scanning) {
            // Short timeout to ensure DOM is ready
            const timeout = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
                );

                scanner.render(onScanSuccess, onScanFailure);
                scannerRef.current = scanner;
            }, 100);
            return () => clearTimeout(timeout);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [scanResult, scanning]);

    const onScanSuccess = async (decodedText: string) => {
        // Stop scanning immediately
        if (scannerRef.current) {
            try {
                await scannerRef.current.clear();
            } catch (e) { console.error(e); }
        }
        setScanning(false);

        // Call API
        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: decodedText }),
            });
            const data = await response.json();
            setScanResult(data);
        } catch (error) {
            setScanResult({ valid: false, status: 'error', message: 'Network/Server Error' });
        }
    };

    const onScanFailure = (error: any) => {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    };

    const handleReset = () => {
        setScanResult(null);
        setScanning(true);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">

            {/* Header */}
            {!scanResult && (
                <div className="text-white text-center mb-6">
                    <h1 className="text-2xl font-bold">Event Entry Gate</h1>
                    <p className="text-gray-400 text-sm">Scan Visitor QR Code</p>
                </div>
            )}

            {/* Scanner View */}
            {scanning && (
                <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl p-4">
                    <div id="reader" className="w-full"></div>
                    <p className="text-center text-gray-500 mt-2 text-sm">Align QR code within the frame</p>
                </div>
            )}

            {/* Result View */}
            {scanResult && (
                <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl text-center animate-fade-in
            ${scanResult.status === 'verified' ? 'bg-green-50' :
                        scanResult.status === 'used' ? 'bg-red-50' : 'bg-gray-800'}
        `}>

                    {/* Icons */}
                    <div className="flex justify-center mb-6">
                        {scanResult.status === 'verified' && <FaCheckCircle className="text-green-500 text-7xl" />}
                        {scanResult.status === 'used' && <FaExclamationTriangle className="text-red-500 text-7xl" />}
                        {(scanResult.status === 'invalid' || scanResult.status === 'error') && <FaTimesCircle className="text-gray-400 text-7xl" />}
                    </div>

                    {/* Status Text */}
                    <h2 className={`text-3xl font-black uppercase mb-2 ${scanResult.status === 'verified' ? 'text-green-600' :
                        scanResult.status === 'used' ? 'text-red-600' : 'text-gray-300'
                        }`}>
                        {scanResult.status === 'verified' ? 'VERIFIED' :
                            scanResult.status === 'used' ? 'ALREADY USED' : 'INVALID'}
                    </h2>

                    {/* Message */}
                    {scanResult.message && (
                        <p className="text-gray-500 mb-6 font-medium">{scanResult.message}</p>
                    )}

                    {/* Participant Details */}
                    {scanResult.participant && (
                        <div className="text-left bg-white/50 p-4 rounded-xl border border-gray-200 mb-6">
                            {/* Photo and Details Layout */}
                            <div className="flex gap-4 mb-3">
                                {/* Photo Section */}
                                <div className="flex-shrink-0">
                                    {scanResult.participant.photoUrl ? (
                                        <div className="relative">
                                            <img
                                                src={scanResult.participant.photoUrl}
                                                alt={scanResult.participant.name}
                                                className="w-20 h-20 rounded-lg object-cover border-2 border-gray-300 shadow-md"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                                }}
                                            />
                                            {scanResult.participant.rollNo && (
                                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                                                    {scanResult.participant.rollNo}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Details Section */}
                                <div className="flex-grow">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Participant</p>
                                    <p className="text-xl font-bold text-gray-800 leading-tight mb-2">{scanResult.participant.name}</p>
                                    <p className="text-xs text-gray-600 font-medium">{scanResult.participant.college}</p>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 pt-3">
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Event</p>
                                <p className="text-md text-purple-600 font-bold">{scanResult.participant.event_name}</p>
                            </div>

                            {scanResult.status === 'used' && scanResult.participant.check_in_time && (
                                <div className="mt-3 pt-3 border-t border-red-100">
                                    <p className="text-xs text-red-500 uppercase font-bold">First Scanned At</p>
                                    <p className="text-red-700 font-mono">{scanResult.participant.check_in_time}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handleReset}
                        className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                    >
                        Scan Next Visitor
                    </button>
                </div>
            )}
        </div>
    );
}
