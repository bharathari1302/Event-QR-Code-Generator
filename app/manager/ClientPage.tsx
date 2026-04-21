'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CalendarDays,
    Users,
    ArrowRight,
    Activity,
    TrendingUp,
    LayoutDashboard,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Mail,
    QrCode,
    Zap
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { StatCard } from '@/app/components/ui/StatCard';
import { Button } from '@/app/components/ui/Button';

type Event = {
    id: string;
    name: string;
    date: string;
    venue: string;
};

export default function ManagerDashboard() {
    const { user, adminDetails, loading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [fetching, setFetching] = useState(true);
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalParticipants: 0,
        pendingEmails: 0,
        loading: true
    });

    useEffect(() => {
        if (!loading && user) {
            fetchEvents();
            fetchStats();
        }
    }, [user, loading]);

    const fetchEvents = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (data.success) {
                setEvents(data.events);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            setStats({
                totalEvents: data.totalEvents || 0,
                totalParticipants: data.totalParticipants || 0,
                pendingEmails: data.pendingEmails || 0,
                loading: false
            });
        } catch (err) {
            console.error('Failed to fetch stats', err);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-2xl"></div>
                    <p className="text-sm text-slate-400">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">
                        {greeting()}, {user.displayName || user.email?.split('@')[0]}! 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Here&apos;s your event management overview for today.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-gray-200/60 rounded-xl px-4 py-2 shadow-sm w-fit">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    {adminDetails && (
                        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/40">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            Mapped to Admin: {adminDetails.name}
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <StatCard
                    label="Assigned Events"
                    value={stats.loading ? '...' : stats.totalEvents}
                    icon={CalendarDays}
                    className="border-l-4 border-l-indigo-500"
                />
                <StatCard
                    label="Total Participants"
                    value={stats.loading ? '...' : stats.totalParticipants.toLocaleString()}
                    icon={TrendingUp}
                    className="border-l-4 border-l-violet-500"
                />
                <StatCard
                    label="Food Scanner"
                    value="Active"
                    icon={QrCode}
                    className="border-l-4 border-l-emerald-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                {/* Events List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-indigo-600" />
                            My Events
                        </h2>
                        <Link href="/manager/events" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fetching ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-36 bg-white border border-gray-200/60 rounded-2xl animate-pulse" />
                            ))
                        ) : events.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
                                <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No events assigned yet</p>
                                <p className="text-xs text-slate-400 mt-1">Events assigned by the admin will appear here.</p>
                            </div>
                        ) : (
                            events.slice(0, 4).map(event => (
                                <div key={event.id} className="group bg-white border border-gray-200/60 rounded-2xl p-5 card-premium relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-violet-50/0 group-hover:from-indigo-50/60 group-hover:to-violet-50/30 transition-all duration-500" />
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="p-2 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
                                                <CalendarDays className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/40">Active</span>
                                        </div>
                                        <h3 className="font-bold text-base mb-1 group-hover:text-indigo-700 transition-colors truncate text-slate-800">{event.name}</h3>
                                        <div className="flex items-center text-xs text-slate-400 gap-1.5 mb-4">
                                            <Clock className="w-3 h-3" />
                                            {event.date || 'Date not set'}
                                        </div>
                                        <Link href={`/manager/manage/${event.id}`}>
                                            <Button variant="outline" size="sm" className="w-full text-xs group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white group-hover:border-transparent transition-all duration-300">
                                                Manage Event <ArrowRight className="ml-2 w-3 h-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Quick Actions + Role Info */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/food-scanner"
                                className="group flex items-center gap-4 bg-white border border-gray-200/60 rounded-2xl p-4 card-premium"
                            >
                                <div className="p-3 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl group-hover:shadow-md group-hover:shadow-cyan-200/30 transition-all duration-300">
                                    <Activity className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-slate-800">Food Scanner</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Scan &amp; verify meal tokens</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all duration-300" />
                            </Link>

                            <Link
                                href="/warden/dashboard"
                                className="group flex items-center gap-4 bg-white border border-gray-200/60 rounded-2xl p-4 card-premium"
                            >
                                <div className="p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl group-hover:shadow-md group-hover:shadow-violet-200/30 transition-all duration-300">
                                    <TrendingUp className="w-5 h-5 text-violet-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-slate-800">Food Stats</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">View meal check-in analytics</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all duration-300" />
                            </Link>

                            <Link
                                href="/manager/events"
                                className="group flex items-center gap-4 bg-white border border-gray-200/60 rounded-2xl p-4 card-premium"
                            >
                                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl group-hover:shadow-md group-hover:shadow-amber-200/30 transition-all duration-300">
                                    <Users className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-slate-800">Manage Participants</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">View all events &amp; participants</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-500 transition-all duration-300" />
                            </Link>
                        </div>
                    </div>

                    {/* Role Info */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="relative z-10">
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-white">
                                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                                Manager Access
                            </h3>
                            <ul className="space-y-2.5 text-xs text-slate-300">
                                {[
                                    { icon: CheckCircle2, text: 'Sync Google Sheets' },
                                    { icon: CheckCircle2, text: 'Manage Coordinators' },
                                    { icon: CheckCircle2, text: 'Send Token Emails' },
                                    { icon: CheckCircle2, text: 'Monitor Food Stats' },
                                    { icon: CheckCircle2, text: 'Upload Participant Data' },
                                ].map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-center gap-2.5">
                                        <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
