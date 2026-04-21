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
    const { logout, eventMeals, adminDetails } = useAuth();
    const [selectedMeal, setSelectedMeal] = useState<string>(eventMeals && eventMeals.length > 0 ? eventMeals[0] : 'breakfast');

    useEffect(() => {
        if (eventMeals && eventMeals.length > 0 && !eventMeals.includes(selectedMeal)) {
            setSelectedMeal(eventMeals[0]);
        }
    }, [eventMeals]);

    useEffect(() => {
        if (!scanResult && scanning) {
            const timeout = setTimeout(() => {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
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

        const qrPayload = decodedText;

        try {
            const response = await fetch('/api/verify-food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrPayload, dryRun: true, selectedMeal }),
            });
            const data = await response.json();

            if (data.status === 'eligible') {
                data.status = 'verified';
                data.message = 'Verified';
                data.qrPayload = qrPayload;
            }
            setScanResult(data);
        } catch (error) {
            setScanResult({ valid: false, status: 'error', message: 'Network/Server Error' });
        }
    };

    const handleApprove = async () => {
        if (!scanResult || !scanResult.participant) return;

        const payload = scanResult.qrPayload;
        handleReset();

        try {
            await fetch('/api/verify-food', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrPayload: payload, dryRun: false, selectedMeal }),
            });
        } catch (error) {
            console.error("Background approval failed:", error);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '6s' }} />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Logout Button */}
            <button
                onClick={logout}
                className="fixed top-4 right-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold py-2.5 px-5 rounded-xl backdrop-blur-sm border border-red-500/20 flex items-center gap-2 transition-all duration-300 z-50"
            >
                <FaSignOutAlt /> Logout
            </button>

            {!scanResult && (
                <div className="text-white text-center mb-6 w-full max-w-md relative z-10 animate-fade-in-up">
                    <h1 className="text-3xl font-black flex items-center justify-center gap-3 mb-2 tracking-tight">
                        <span className="text-2xl">🍽️</span> Food Token Scanner
                    </h1>
                    <p className="text-slate-400 text-sm mb-4 font-medium">Scan any Meal Coupon or Token</p>

                    {adminDetails && (
                        <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 mb-4 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                            Admin: {adminDetails.name}
                        </div>
                    )}

                    {/* Meal Selector */}
                    {eventMeals && eventMeals.length > 0 && (
                        <div className="glass rounded-2xl p-4 mt-2">
                            <label htmlFor="meal-select" className="block text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-2 font-bold">Active Meal Event</label>
                            <select
                                id="meal-select"
                                value={selectedMeal}
                                onChange={(e) => setSelectedMeal(e.target.value)}
                                className="w-full bg-slate-900/80 border-2 border-slate-700/60 rounded-xl py-2.5 px-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors uppercase tracking-widest text-sm cursor-pointer"
                            >
                                {eventMeals.map(meal => (
                                    <option key={meal} value={meal} className="uppercase bg-slate-900 text-white font-semibold">
                                        {meal}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {scanning && (
                <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl shadow-black/30 relative z-10 animate-scale-in">
                    {/* Animated border glow */}
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-2xl animate-gradient-shift opacity-60" style={{ backgroundSize: '200% 200%' }} />
                    <div className="relative bg-white rounded-2xl p-4">
                        <div id="reader" className="w-full"></div>
                    </div>
                </div>
            )}

            {scanResult && (
                <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl shadow-black/30 text-center animate-scale-in relative z-10
                        ${scanResult.status === 'verified' ? 'bg-gradient-to-b from-emerald-50 to-white border border-emerald-200/60' :
                        scanResult.status === 'used' ? 'bg-gradient-to-b from-red-50 to-white border border-red-200/60' :
                            scanResult.status === 'eligible' ? 'bg-gradient-to-b from-amber-50 to-white border border-amber-200/60' : 'bg-slate-800 border border-slate-700'}
                    `}>

                    {/* Meal Type Header */}
                    {scanResult.scanDetails && (
                        <div className="mb-4 inline-block px-4 py-1.5 rounded-full bg-black/10 text-black font-bold uppercase tracking-tight text-xs sm:text-sm">
                            {scanResult.scanDetails.mealType}
                        </div>
                    )}

                    {/* Status Icon */}
                    <div className="flex justify-center mb-4">
                        {scanResult.status === 'verified' && <FaCheckCircle className="text-emerald-500 text-7xl drop-shadow-lg" />}
                        {scanResult.status === 'used' && <FaExclamationTriangle className="text-red-500 text-7xl drop-shadow-lg" />}
                        {scanResult.status === 'eligible' && <FaUtensils className="text-amber-600 text-7xl drop-shadow-lg" />}
                        {(scanResult.status === 'invalid' || scanResult.status === 'error') && <FaTimesCircle className="text-slate-400 text-7xl" />}
                    </div>

                    {/* Status Text */}
                    <h2 className={`text-2xl sm:text-3xl font-black uppercase mb-2 tracking-tight ${scanResult.status === 'verified' ? 'text-emerald-600' :
                        scanResult.status === 'used' ? 'text-red-600' :
                            scanResult.status === 'eligible' ? 'text-amber-700' : 'text-slate-300'
                        }`}>
                        {scanResult.status === 'verified' ? 'ENJOY YOUR MEAL' :
                            scanResult.status === 'used' ? 'ALREADY REDEEMED' :
                                scanResult.status === 'eligible' ? 'CONFIRM MEAL' : 'INVALID COUPON'}
                    </h2>

                    {scanResult.message && <p className="text-slate-500 mb-6 font-medium text-sm">{scanResult.message}</p>}

                    {/* Participant Card */}
                    {scanResult.participant && (
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 text-left relative overflow-hidden shadow-sm">
                            {/* Food Pref Badge */}
                            <div className={`absolute top-0 right-0 p-2 pl-4 rounded-bl-2xl font-bold text-white text-sm flex items-center gap-1 z-10
                                    ${(scanResult.participant.foodPreference || '').toLowerCase().includes('veg') && !(scanResult.participant.foodPreference || '').toLowerCase().includes('non')
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}
                                `}>
                                {(scanResult.participant.foodPreference || '').toLowerCase().includes('veg') && !(scanResult.participant.foodPreference || '').toLowerCase().includes('non')
                                    ? <><FaLeaf /> VEG</> : <><FaDrumstickBite /> NON-VEG</>}
                            </div>

                            {/* Photo and Details */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-shrink-0 flex justify-center sm:block">
                                    {scanResult.participant.photoUrl ? (
                                        <div className="relative">
                                            <img
                                                src={scanResult.participant.photoUrl}
                                                alt={scanResult.participant.name}
                                                className="w-28 h-28 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-gray-200 shadow-md"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="gray" stroke-width="2"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E';
                                                }}
                                            />
                                            {scanResult.participant.rollNo && (
                                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-mono whitespace-nowrap shadow-sm">
                                                    {scanResult.participant.rollNo}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-gray-200">
                                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-grow text-center sm:text-left">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold mb-0.5">Student</p>
                                    <p className="text-lg sm:text-xl font-black text-slate-800 leading-tight mb-2 sm:mb-3">{scanResult.participant.name}</p>

                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold mb-0.5">Room No</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-slate-700">
                                                {scanResult.participant.roomNo || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold mb-0.5">Ticket ID</p>
                                            <p className="text-[10px] font-mono text-slate-500 truncate">{scanResult.participant.ticket_id}</p>
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
                                className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-base sm:text-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-red-500/25 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaTimesCircle /> DECLINE
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-base sm:text-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaCheckCircle /> APPROVE
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleReset}
                            className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-lg active:scale-95"
                        >
                            Scan Next
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
