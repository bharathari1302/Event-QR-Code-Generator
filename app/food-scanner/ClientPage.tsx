'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaUtensils, FaLeaf, FaDrumstickBite } from 'react-icons/fa';

type FoodScanResult = {
    valid: boolean;
    status: 'verified' | 'used' | 'invalid' | 'error';
    participant?: {
        name: string;
        foodPreference: string;
        roomNo?: string;
        college: string;
        ticket_id: string;
    };
    scanDetails?: {
        mealType: string;
    };
    message?: string;
};

export default function FoodScannerPage() {
    const [scanResult, setScanResult] = useState<FoodScanResult | null>(null);
    const [scanning, setScanning] = useState(true);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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

        // Expect format: token|meal
        if (!decodedText.includes('|')) {
            setScanResult({ valid: false, status: 'invalid', message: 'Not a valid Meal Coupon' });
            return;
        }

        try {
            const response = await fetch('/api/verify-food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrPayload: decodedText }),
            });
            const data = await response.json();
            setScanResult(data);
        } catch (error) {
            setScanResult({ valid: false, status: 'error', message: 'Network/Server Error' });
        }
    };

    const onScanFailure = (error: any) => { };

    const handleReset = () => {
        setScanResult(null);
        setScanning(true);
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">

            {!scanResult && (
                <div className="text-white text-center mb-6">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                        <FaUtensils /> Food Token Scanner
                    </h1>
                    <p className="text-gray-400 text-sm">Scan any Meal Coupon</p>
                </div>
            )}

            {scanning && (
                <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl p-4">
                    <div id="reader" className="w-full"></div>
                </div>
            )}

            {scanResult && (
                <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl text-center animate-fade-in
                    ${scanResult.status === 'verified' ? 'bg-green-50' :
                        scanResult.status === 'used' ? 'bg-red-50' : 'bg-gray-800'}
                `}>

                    {/* Meal Type Header */}
                    {scanResult.scanDetails && (
                        <div className="mb-4 inline-block px-4 py-1 rounded-full bg-black/10 text-black font-bold uppercase tracking-wide">
                            {scanResult.scanDetails.mealType}
                        </div>
                    )}

                    {/* Status Icon */}
                    <div className="flex justify-center mb-4">
                        {scanResult.status === 'verified' && <FaCheckCircle className="text-green-500 text-7xl" />}
                        {scanResult.status === 'used' && <FaExclamationTriangle className="text-red-500 text-7xl" />}
                        {(scanResult.status === 'invalid' || scanResult.status === 'error') && <FaTimesCircle className="text-gray-400 text-7xl" />}
                    </div>

                    {/* Status Text */}
                    <h2 className={`text-3xl font-black uppercase mb-2 ${scanResult.status === 'verified' ? 'text-green-600' :
                            scanResult.status === 'used' ? 'text-red-600' : 'text-gray-300'
                        }`}>
                        {scanResult.status === 'verified' ? 'ENJOY YOUR MEAL' :
                            scanResult.status === 'used' ? 'ALREADY REDEEMED' : 'INVALID COUPON'}
                    </h2>

                    {scanResult.message && <p className="text-gray-500 mb-6 font-medium">{scanResult.message}</p>}

                    {/* Participant Card */}
                    {scanResult.participant && (
                        <div className="bg-white p-5 rounded-xl border-2 border-dashed border-gray-300 text-left relative overflow-hidden">
                            {/* Food Pref Badge */}
                            <div className={`absolute top-0 right-0 p-2 pl-4 rounded-bl-xl font-bold text-white text-sm flex items-center gap-1
                                ${scanResult.participant.foodPreference.toLowerCase().includes('veg') && !scanResult.participant.foodPreference.toLowerCase().includes('non')
                                    ? 'bg-green-600' : 'bg-red-600'}
                            `}>
                                {scanResult.participant.foodPreference.toLowerCase().includes('veg') && !scanResult.participant.foodPreference.toLowerCase().includes('non')
                                    ? <><FaLeaf /> VEG</> : <><FaDrumstickBite /> NON-VEG</>}
                            </div>

                            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Student</p>
                            <p className="text-2xl font-bold text-gray-800 leading-tight mb-2">{scanResult.participant.name}</p>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Room No</p>
                                    <p className="text-lg font-mono font-bold text-gray-700">
                                        {scanResult.participant.roomNo || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Ticket ID</p>
                                    <p className="text-sm font-mono text-gray-600">{scanResult.participant.ticket_id}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        className="w-full mt-6 py-4 rounded-xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors shadow-lg active:scale-95"
                    >
                        Scan Next
                    </button>
                </div>
            )}
        </div>
    );
}
