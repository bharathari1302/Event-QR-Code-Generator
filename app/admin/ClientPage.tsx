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
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    const [stats, setStats] = useState({
        totalEvents: 0,
        totalParticipants: 0,
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
                        totalParticipants: data.totalParticipants || 0,
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

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    label="Total Events"
                    value={stats.loading ? "..." : stats.totalEvents}
                    icon={CalendarDays}
                    className="border-l-4 border-l-blue-500"
                />
                <StatCard
                    label="Total Participants"
                    value={stats.loading ? "..." : stats.totalParticipants.toLocaleString()}
                    icon={TrendingUp}
                    className="border-l-4 border-l-green-500"
                />
                <StatCard
                    label="System Users"
                    value={stats.loading ? "..." : stats.totalUsers}
                    icon={Users}
                    className="border-l-4 border-l-purple-500"
                />
            </div>

            {/* Quick Actions / Modules */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Manage Events Card */}
                    <Link href="/admin/events" className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="flex items-start justify-between">
                            <div className="space-y-4">
                                <div className="p-3 bg-primary/10 w-fit rounded-lg">
                                    <CalendarDays className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-card-foreground">Manage Events</h3>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Create new events, sync Google Sheets, and send invitations.
                                    </p>
                                </div>
                                <div className="text-primary font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                    Go to Events <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>

                    {/* Manage Users Card */}
                    <Link href="/admin/users" className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-secondary/20">
                        <div className="flex items-start justify-between">
                            <div className="space-y-4">
                                <div className="p-3 bg-secondary/10 w-fit rounded-lg">
                                    <UserPlus className="h-6 w-6 text-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-card-foreground">Manage Users</h3>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        Create accounts for Managers, Wardens, and Coordinators.
                                    </p>
                                </div>
                                <div className="text-secondary font-medium flex items-center group-hover:translate-x-1 transition-transform">
                                    Manage Accounts <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </div>
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}
