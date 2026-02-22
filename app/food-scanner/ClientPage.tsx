'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUtensils, FaLeaf, FaDrumstickBite, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '@/app/context/AuthContext';

type FoodScanResult = {
    valid: boolean;
    status: 'verified' | 'used' | 'invalid' | 'error' | 'eligible';
    participant?: {
        name: string;
        foodPreference: string;
        roomNo?: string;
        rollNo?: string;
        college: string;
        ticket_id: string;
        photoUrl?: string | null;
    };
    scanDetails?: {
        mealType: string;
    };
    message?: string;
    qrPayload?: string;
};

type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner' | 'icecream';

export default function FoodScannerPage() {
    const [scanResult, setScanResult] = useState<FoodScanResult | null>(null);
    const [scanning, setScanning] = useState(true);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const { logout } = useAuth();

    useEffect(() => {
        if (!scanResult && scanning) {
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
        if (scannerRef.current) {
            try { await scannerRef.current.clear(); } catch (e) { }
        }
        setScanning(false);

        // Use the QR code as-is since it already contains meal information
        const qrPayload = decodedText;

        try {
            // Use dry run to verify and show photo/details before marking as used
            const response = await fetch('/api/verify-food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrPayload, dryRun: true }),
            });
            const data = await response.json();

            // Store the payload for the approve action
            if (data.status === 'eligible') {
                // Change status to 'verified' to show the old design
                data.status = 'verified';
                data.message = 'Verified';
                // Attach payload to data so we can use it in handleApprove
                data.qrPayload = qrPayload;
            }
            setScanResult(data);
        } catch (error) {
            setScanResult({ valid: false, status: 'error', message: 'Network/Server Error' });
        }
    };

    const handleApprove = async () => {
        if (!scanResult || !scanResult.participant) return;

        // We need the original payload. 
        // detailed hack: access it if we stored it in state, or just reconstruction from existing data is risky if we don't have the raw token.
        // Let's rely on the fact that we can store it in the scanResult state temporarily (as done above in onScanSuccess modification)
        // casting to any to access custom property we just added
        const payload = scanResult.qrPayload;

        // Optimistic Update: Immediately reset to scanning
        // We fire the API call in the background and don't wait for it.
        // Ideally we should have a global toast or error handler if this fails, 
        // but for speed as requested, we prioritize the UI reset.
        handleReset();

        try {
            await fetch('/api/verify-food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrPayload: payload, dryRun: false }),
            });
            // Success - do nothing as we already reset
        } catch (error) {
            console.error("Background approval failed:", error);
            // In a real app, we might want to alert the user here, 
            // but since we already reset, showing an alert might interrupt the next scan.
            // For now, we log to console.
        }
    };

    const handleReject = () => {
        handleReset();
    };

    const onScanFailure = (error: any) => { };

    const handleReset = () => {
        setScanResult(null);
        setScanning(true);
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">

            {/* Logout Button - Fixed Position */}
            <button
                onClick={logout}
                className="fixed top-4 right-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 z-50"
            >
                <FaSignOutAlt /> Logout
            </button>

            {!scanResult && (
                <div className="text-white text-center mb-6">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                        <FaUtensils /> Food Token Scanner
                    </h1>
                    <p className="text-gray-400 text-sm">Scan any Meal Coupon or Token</p>
                </div>
            )}

            {scanning && (
                <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl p-4">
                    <div id="reader" className="w-full"></div>
                </div>
            )}

            {scanResult && (
                <div className={`w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-2xl text-center animate-fade-in
                    ${scanResult.status === 'verified' ? 'bg-green-50' :
                        scanResult.status === 'used' ? 'bg-red-50' :
                            scanResult.status === 'eligible' ? 'bg-yellow-50' : 'bg-gray-800'}
                `}>

                    {/* Meal Type Header */}
                    {scanResult.scanDetails && (
                        <div className="mb-4 inline-block px-4 py-1 rounded-full bg-black/10 text-black font-bold uppercase tracking-tight text-xs sm:text-sm">
                            {scanResult.scanDetails.mealType}
                        </div>
                    )}

                    {/* Status Icon */}
                    <div className="flex justify-center mb-4">
                        {scanResult.status === 'verified' && <FaCheckCircle className="text-green-500 text-7xl" />}
                        {scanResult.status === 'used' && <FaExclamationTriangle className="text-red-500 text-7xl" />}
                        {scanResult.status === 'eligible' && <FaUtensils className="text-yellow-600 text-7xl" />}
                        {(scanResult.status === 'invalid' || scanResult.status === 'error') && <FaTimesCircle className="text-gray-400 text-7xl" />}
                    </div>

                    {/* Status Text */}
                    <h2 className={`text-2xl sm:text-3xl font-black uppercase mb-2 ${scanResult.status === 'verified' ? 'text-green-600' :
                        scanResult.status === 'used' ? 'text-red-600' :
                            scanResult.status === 'eligible' ? 'text-yellow-700' : 'text-gray-300'
                        }`}>
                        {scanResult.status === 'verified' ? 'ENJOY YOUR MEAL' :
                            scanResult.status === 'used' ? 'ALREADY REDEEMED' :
                                scanResult.status === 'eligible' ? 'CONFIRM MEAL' : 'INVALID COUPON'}
                    </h2>

                    {scanResult.message && <p className="text-gray-500 mb-6 font-medium">{scanResult.message}</p>}

                    {/* Participant Card */}
                    {scanResult.participant && (
                        <div className="bg-white p-5 rounded-xl border-2 border-dashed border-gray-300 text-left relative overflow-hidden">
                            {/* Food Pref Badge */}
                            <div className={`absolute top-0 right-0 p-2 pl-4 rounded-bl-xl font-bold text-white text-sm flex items-center gap-1 z-10
                                ${scanResult.participant.foodPreference.toLowerCase().includes('veg') && !scanResult.participant.foodPreference.toLowerCase().includes('non')
                                    ? 'bg-green-600' : 'bg-red-600'}
                            `}>
                                {scanResult.participant.foodPreference.toLowerCase().includes('veg') && !scanResult.participant.foodPreference.toLowerCase().includes('non')
                                    ? <><FaLeaf /> VEG</> : <><FaDrumstickBite /> NON-VEG</>}
                            </div>

                            {/* Photo and Details Layout */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                {/* Photo Section */}
                                <div className="flex-shrink-0 flex justify-center sm:block">
                                    {scanResult.participant.photoUrl ? (
                                        <div className="relative">
                                            <img
                                                src={scanResult.participant.photoUrl}
                                                alt={scanResult.participant.name}
                                                className="w-28 h-28 sm:w-24 sm:h-24 rounded-lg object-cover border-2 border-gray-300 shadow-md"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    // Fallback to placeholder if image fails to load
                                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                                }}
                                            />
                                            {scanResult.participant.rollNo && (
                                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
                                                    {scanResult.participant.rollNo}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Details Section */}
                                <div className="flex-grow text-center sm:text-left">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Student</p>
                                    <p className="text-lg sm:text-xl font-bold text-gray-800 leading-tight mb-2 sm:mb-3">{scanResult.participant.name}</p>

                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Room No</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-gray-700">
                                                {scanResult.participant.roomNo || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Ticket ID</p>
                                            <p className="text-[10px] font-mono text-gray-600 truncate">{scanResult.participant.ticket_id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {scanResult.status === 'verified' ? (
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
                            <button
                                onClick={handleReject}
                                className="flex-1 py-3 sm:py-4 rounded-xl bg-red-600 text-white font-bold text-base sm:text-lg hover:bg-red-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaTimesCircle /> DECLINE
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 py-3 sm:py-4 rounded-xl bg-green-600 text-white font-bold text-base sm:text-lg hover:bg-green-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaCheckCircle /> APPROVE
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleReset}
                            className="w-full mt-6 py-4 rounded-xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors shadow-lg active:scale-95"
                        >
                            Scan Next
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
