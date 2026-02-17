'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { FaUserShield, FaIdCard, FaSpinner, FaLock, FaEnvelope } from 'react-icons/fa';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'admin' | 'coordinator'>('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rollNo, setRollNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Redirection handled in AuthContext or useEffect
        } catch (err: any) {
            console.error(err);
            setError('Invalid Email or Password.');
            setLoading(false);
        }
    };

    const handleCoordinatorLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await coordinatorLogin(rollNo);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

                {/* Header Section */}
                <div className="bg-slate-100 p-8 text-center border-b border-gray-200">
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 text-sm">Sign in to manage or verifying attendees</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => { setActiveTab('admin'); setError(''); }}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all
              ${activeTab === 'admin'
                                ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                                : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700'}
            `}
                    >
                        <FaUserShield className="text-lg" />
                        Admin / Manager
                    </button>
                    <button
                        onClick={() => { setActiveTab('coordinator'); setError(''); }}
                        className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all
              ${activeTab === 'coordinator'
                                ? 'text-purple-600 bg-white border-b-2 border-purple-600'
                                : 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-700'}
            `}
                    >
                        <FaIdCard className="text-lg" />
                        Food Scanner
                    </button>
                </div>

                {/* Form Container */}
                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    {activeTab === 'admin' ? (
                        /* Admin/Manager Form */
                        <form onSubmit={handleAdminLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute top-3.5 left-3 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                <div className="relative">
                                    <FaLock className="absolute top-3.5 left-3 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : 'Log In as Admin'}
                            </button>
                        </form>
                    ) : (
                        /* Coordinator Form */
                        <form onSubmit={handleCoordinatorLogin} className="space-y-5">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-2">
                                <p className="text-xs text-purple-700 text-center">
                                    Enter your verified Roll Number to access the Food Scanner.
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Roll Number</label>
                                <div className="relative">
                                    <FaIdCard className="absolute top-3.5 left-3 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={rollNo}
                                        onChange={(e) => setRollNo(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 text-gray-800 uppercase"
                                        placeholder="e.g. 21CS001"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <FaSpinner className="animate-spin" /> : 'Access Scanner'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center border-t border-gray-200">
                    <p className="text-xs text-gray-400">© 2026 Event Management System</p>
                </div>

            </div>
        </div>
    );
}
