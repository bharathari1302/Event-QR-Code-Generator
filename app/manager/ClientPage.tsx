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
    const { user, loading } = useAuth();
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
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {greeting()}, {user.displayName || user.email?.split('@')[0]}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's your event management overview for today.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-lg px-4 py-2 shadow-sm w-fit">
                    <Clock className="w-4 h-4" />
                    <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    label="Assigned Events"
                    value={stats.loading ? '...' : stats.totalEvents}
                    icon={CalendarDays}
                    className="border-l-4 border-l-blue-500"
                />
                <StatCard
                    label="Total Participants"
                    value={stats.loading ? '...' : stats.totalParticipants.toLocaleString()}
                    icon={TrendingUp}
                    className="border-l-4 border-l-green-500"
                />
                <StatCard
                    label="Food Scanner"
                    value="Active"
                    icon={QrCode}
                    className="border-l-4 border-l-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Events List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            My Events
                        </h2>
                        <Link href="/manager/events" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {fetching ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-36 bg-card border border-border rounded-xl animate-pulse" />
                            ))
                        ) : events.length === 0 ? (
                            <div className="col-span-full py-16 text-center bg-card border border-dashed border-border rounded-xl">
                                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                                <p className="text-muted-foreground font-medium">No events assigned yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Events assigned by the admin will appear here.</p>
                            </div>
                        ) : (
                            events.slice(0, 4).map(event => (
                                <div key={event.id} className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <CalendarDays className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-semibold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                                    </div>
                                    <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors truncate">{event.name}</h3>
                                    <div className="flex items-center text-xs text-muted-foreground gap-1.5 mb-4">
                                        <Clock className="w-3 h-3" />
                                        {event.date || 'Date not set'}
                                    </div>
                                    <Link href={`/manager/manage/${event.id}`}>
                                        <Button variant="outline" size="sm" className="w-full text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                            Manage Event <ArrowRight className="ml-2 w-3 h-3" />
                                        </Button>
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Quick Actions + Role Info */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/food-scanner"
                                className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-orange-500/40 hover:shadow-md transition-all"
                            >
                                <div className="p-3 bg-orange-100 rounded-lg group-hover:scale-110 transition-transform">
                                    <Activity className="w-5 h-5 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-foreground">Food Scanner</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Scan &amp; verify meal tokens</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href="/warden/dashboard"
                                className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-blue-500/40 hover:shadow-md transition-all"
                            >
                                <div className="p-3 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-foreground">Food Stats</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">View meal check-in analytics</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href="/manager/events"
                                className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-green-500/40 hover:shadow-md transition-all"
                            >
                                <div className="p-3 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
                                    <Users className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm text-foreground">Manage Participants</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">View all events &amp; participants</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Role Info */}
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5">
                        <h3 className="font-bold text-primary flex items-center gap-2 mb-3">
                            <LayoutDashboard className="w-4 h-4" />
                            Manager Access
                        </h3>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            {[
                                { icon: CheckCircle2, text: 'Sync Google Sheets' },
                                { icon: CheckCircle2, text: 'Manage Coordinators' },
                                { icon: CheckCircle2, text: 'Send Token Emails' },
                                { icon: CheckCircle2, text: 'Monitor Food Stats' },
                                { icon: CheckCircle2, text: 'Upload Participant Data' },
                            ].map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
