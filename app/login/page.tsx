'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { signIn } from 'next-auth/react';
import { FaUserShield, FaIdCard, FaSpinner, FaLock, FaEnvelope, FaGoogle } from 'react-icons/fa';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'admin' | 'coordinator'>('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [otp, setOtp] = useState('');
    const [otpMode, setOtpMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const { role, user, login, coordinatorLogin } = useAuth();
    const router = useRouter();

    // Redirect if already logged in
    if (user && role) {
        if (role === 'admin') router.push('/admin');
        else if (role === 'manager') router.push('/manager');
        else if (role === 'coordinator') router.push('/food-scanner');
    }

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
        } catch (err: any) {
            console.error(err);
            setError('Invalid Email or Password.');
            setLoading(false);
        }
    };

    const handleCoordinatorLoginStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const res = await fetch('/api/auth/coordinator-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollNo }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            if (data.requiresOtp) {
                setOtpMode(true);
                setSuccessMsg(data.message || 'OTP sent successfully!');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCoordinatorVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            await coordinatorLogin(rollNo, otp);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'OTP Verification Failed');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: '🎫',
            title: 'QR Token System',
            desc: 'Generate & verify QR-based meal tokens instantly',
        },
        {
            icon: '📊',
            title: 'Live Analytics',
            desc: 'Real-time food statistics & meal tracking dashboard',
        },
        {
            icon: '👥',
            title: 'Multi-Role Access',
            desc: 'Admin, Manager, Warden & Coordinator roles',
        },
        {
            icon: '📋',
            title: 'Dynamic Forms',
            desc: 'Custom registration forms with roll-no verification',
        },
    ];

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">

            {/* ==================== LEFT SIDE — Project Info ==================== */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-blob" />
                    <div className="absolute top-1/3 right-0 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl animate-blob delay-200" style={{ animationDelay: '4s' }} />
                    <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-blob" style={{ animationDelay: '8s' }} />
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
                    {/* Logo & Brand */}
                    <div className="animate-slide-in-left mb-12">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center p-1.5 shadow-xl shadow-black/10">
                                <img src="/logo.png" alt="Q-Swift Logo" className="w-full h-full object-contain rounded-xl" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tight">Q-Swift</h1>
                                <p className="text-indigo-300 text-sm font-medium tracking-wider uppercase">Access Pass</p>
                            </div>
                        </div>
                        <p className="text-xl text-white/70 leading-relaxed max-w-lg">
                            Professional <span className="text-white font-semibold">Event Management</span> &amp; <span className="text-white font-semibold">QR Token Verification</span> platform for hostel meals, events, and student management.
                        </p>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        {features.map((feat, i) => (
                            <div
                                key={feat.title}
                                className="animate-fade-in-up group glass rounded-2xl p-5 hover:bg-white/12 transition-all duration-300 cursor-default"
                                style={{ animationDelay: `${(i + 1) * 150}ms`, opacity: 0 }}
                            >
                                <span className="text-2xl mb-3 block">{feat.icon}</span>
                                <h3 className="text-white font-bold text-sm mb-1">{feat.title}</h3>
                                <p className="text-white/50 text-xs leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Bottom stats ticker */}
                    <div className="mt-12 flex items-center gap-6 animate-fade-in" style={{ animationDelay: '1s', opacity: 0 }}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-white/40 text-xs font-medium">System Online</span>
                        </div>
                        <div className="h-3 w-px bg-white/10" />
                        <span className="text-white/40 text-xs">Secure • Reliable • Fast</span>
                    </div>
                </div>
            </div>

            {/* ==================== RIGHT SIDE — Login Form ==================== */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-12">
                <div className="w-full max-w-md animate-scale-in">

                    {/* Mobile Logo (shown only on small screens) */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center p-1.5 shadow-lg border border-indigo-100/60">
                                <img src="/logo.png" alt="Q-Swift Logo" className="w-full h-full object-contain rounded-xl" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Q-Swift</h1>
                        <p className="text-slate-500 text-xs mt-1">Event QR &amp; Token Verification System</p>
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200/60">

                        {/* Card Header */}
                        <div className="px-6 sm:px-8 pt-8 pb-6">
                            <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
                            <p className="text-slate-500 text-sm">Sign in to manage or verify attendees</p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex mx-6 sm:mx-8 mb-6 bg-gray-100 rounded-xl p-1">
                            <button
                                onClick={() => { setActiveTab('admin'); setError(''); }}
                                className={`flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-lg transition-all duration-300
                                    ${activeTab === 'admin'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'}
                                `}
                            >
                                <FaUserShield className="text-base" />
                                Admin / Manager
                            </button>
                            <button
                                onClick={() => { setActiveTab('coordinator'); setError(''); setSuccessMsg(''); }}
                                className={`flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-lg transition-all duration-300
                                    ${activeTab === 'coordinator'
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'}
                                `}
                            >
                                <FaIdCard className="text-base" />
                                Food Scanner
                            </button>
                        </div>

                        {/* Form Container */}
                        <div className="px-6 sm:px-8 pb-8">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-5 text-xs sm:text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}
                            {successMsg && (
                                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg mb-5 text-xs sm:text-sm animate-fade-in">
                                    {successMsg}
                                </div>
                            )}

                            {activeTab === 'admin' ? (
                                /* Admin/Manager Form */
                                <form onSubmit={handleAdminLogin} className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Email Address</label>
                                        <div className="relative">
                                            <FaEnvelope className="absolute top-3.5 left-3.5 text-gray-400 text-sm" />
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800"
                                                placeholder="name@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Password</label>
                                        <div className="relative">
                                            <FaLock className="absolute top-3.5 left-3.5 text-gray-400 text-sm" />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                    >
                                        {loading ? <FaSpinner className="animate-spin" /> : 'Log In as Admin'}
                                    </button>

                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold">OR</span>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => signIn('google', { callbackUrl: '/admin' })}
                                        className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3"
                                    >
                                        <FaGoogle className="text-red-500" />
                                        Sign in with Google (Drive Access)
                                    </button>
                                </form>
                            ) : (
                                /* Coordinator Form */
                                !otpMode ? (
                                    <form onSubmit={handleCoordinatorLoginStep1} className="space-y-5">
                                        <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 mb-2">
                                            <p className="text-xs text-violet-700 text-center">
                                                Enter your verified Roll Number. An OTP will be sent to your registered email.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Roll Number</label>
                                            <div className="relative">
                                                <FaIdCard className="absolute top-3.5 left-3.5 text-gray-400 text-sm" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={rollNo}
                                                    onChange={(e) => setRollNo(e.target.value)}
                                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800 uppercase"
                                                    placeholder="e.g. 21CS001"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                        >
                                            {loading ? <FaSpinner className="animate-spin" /> : 'Send OTP'}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleCoordinatorVerifyOtp} className="space-y-5">
                                        <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 mb-2">
                                            <p className="text-xs text-violet-700 text-center">
                                                Enter the 6-digit OTP sent to your registered email address for Roll No: <span className="font-bold">{rollNo}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">One-Time Password (OTP)</label>
                                            <div className="relative">
                                                <FaLock className="absolute top-3.5 left-3.5 text-gray-400 text-sm" />
                                                <input
                                                    type="text"
                                                    required
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800 tracking-[0.3em] text-center font-bold text-lg"
                                                    placeholder="••••••"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || otp.length < 6}
                                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-violet-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                        >
                                            {loading ? <FaSpinner className="animate-spin" /> : 'Verify & Access Scanner'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setOtpMode(false); setSuccessMsg(''); setError(''); }}
                                            className="w-full mt-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors py-2"
                                        >
                                            &larr; Back to Roll Number entry
                                        </button>
                                    </form>
                                )
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 sm:px-8 py-4 text-center border-t border-gray-100">
                            <p className="text-[11px] text-gray-400">
                                Developed by <span className="font-semibold text-gray-600">BHARAT HARI S</span> <span className="mx-1 text-gray-300">•</span> AIML
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
