'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, Users, ArrowRight, UserPlus, TrendingUp, Activity } from 'lucide-react';
import { StatCard } from '@/app/components/ui/StatCard';
import { Button } from '@/app/components/ui/Button';

export default function AdminPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            }
        }
    }, [user, role, loading, router]);

    if (loading || !user || role !== 'admin') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-2xl mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    const [stats, setStats] = useState({
        totalEvents: 0,
        totalStudents: 0,
        totalUsers: 0,
        loading: true
    });

    useEffect(() => {
        if (!loading && user) {
            fetch('/api/admin/stats')
                .then(res => res.json())
                .then(data => {
                    setStats({
                        totalEvents: data.totalEvents || 0,
                        totalStudents: data.totalStudents || 0,
                        totalUsers: data.totalUsers || 0,
                        loading: false
                    });
                })
                .catch(err => {
                    console.error('Failed to fetch stats', err);
                    setStats(prev => ({ ...prev, loading: false }));
                });
        }
    }, [user, loading]);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="animate-fade-in-up">
                <h1 className="text-3xl font-black tracking-tight text-slate-800">
                    {greeting()}, {user.displayName || user.email?.split('@')[0]}! 👋
                </h1>
                <p className="text-slate-500 mt-2">Welcome back! Here&apos;s what&apos;s happening today.</p>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard
                    label="Total Events"
                    value={stats.loading ? "..." : stats.totalEvents}
                    icon={CalendarDays}
                    className="border-l-4 border-l-indigo-500"
                />
                <StatCard
                    label="Total Students"
                    value={stats.loading ? "..." : stats.totalStudents.toLocaleString()}
                    icon={TrendingUp}
                    className="border-l-4 border-l-violet-500"
                />
                <StatCard
                    label="System Users"
                    value={stats.loading ? "..." : stats.totalUsers}
                    icon={Users}
                    className="border-l-4 border-l-cyan-500"
                />
            </div>

            {/* Quick Actions / Modules */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-xl font-bold mb-5 text-slate-800">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Manage Events Card */}
                    <Link href="/admin/events" className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm card-premium">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/80 group-hover:to-violet-50/40 transition-all duration-500" />
                        <div className="relative z-10 space-y-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100 w-fit rounded-xl group-hover:shadow-md group-hover:shadow-indigo-200/50 transition-all duration-300">
                                <CalendarDays className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Manage Events</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                                    Create new events, sync Google Sheets, and send invitations.
                                </p>
                            </div>
                            <div className="text-indigo-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform duration-300">
                                Go to Events <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    </Link>

                    {/* Manage Users Card */}
                    <Link href="/admin/users" className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm card-premium">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/0 to-purple-50/0 group-hover:from-violet-50/80 group-hover:to-purple-50/40 transition-all duration-500" />
                        <div className="relative z-10 space-y-4">
                            <div className="p-3 bg-gradient-to-br from-violet-50 to-violet-100 w-fit rounded-xl group-hover:shadow-md group-hover:shadow-violet-200/50 transition-all duration-300">
                                <UserPlus className="h-6 w-6 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Manage Users</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                                    Create accounts for Managers, Wardens, and Coordinators.
                                </p>
                            </div>
                            <div className="text-violet-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform duration-300">
                                Manage Accounts <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    </Link>

                    {/* Food Scanner Card */}
                    <Link href="/food-scanner" className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm card-premium">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/0 to-teal-50/0 group-hover:from-cyan-50/80 group-hover:to-teal-50/40 transition-all duration-500" />
                        <div className="relative z-10 space-y-4">
                            <div className="p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 w-fit rounded-xl group-hover:shadow-md group-hover:shadow-cyan-200/50 transition-all duration-300">
                                <Activity className="h-6 w-6 text-cyan-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Food Scanner</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                                    Scan meal coupons and verify student food tokens.
                                </p>
                            </div>
                            <div className="text-cyan-600 font-semibold text-sm flex items-center group-hover:translate-x-1 transition-transform duration-300">
                                Open Scanner <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}
