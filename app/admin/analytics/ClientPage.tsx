'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, RadialBarChart, RadialBar } from 'recharts';
import { Loader2, TrendingUp, Users, Calendar, PieChart as PieChartIcon, Star, Activity, Target } from 'lucide-react';

export default function AnalyticsClientPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            } else {
                fetchAnalytics();
            }
        }
    }, [user, role, authLoading, router]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/admin/analytics');
            if (res.ok) {
                const json = await res.json();
                setData(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <PieChartIcon className="w-8 h-8 text-indigo-600 fill-indigo-100" />
                        Analytics & Statistics
                    </h1>
                    <p className="text-muted-foreground mt-1">Visualize data from Daily Meals and Special Events.</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Daily Facilities</p>
                        <h3 className="text-2xl font-bold text-foreground">{data.summary.totalDailyMeals}</h3>
                    </div>
                </div>
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Star className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Special Events</p>
                        <h3 className="text-2xl font-bold text-foreground">{data.summary.totalSpecialEvents}</h3>
                    </div>
                </div>
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                        <h3 className="text-2xl font-bold text-foreground">{data.summary.totalParticipants}</h3>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Daily Meals Trend Chart */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-card-foreground">Daily Meals Trend</h2>
                            <p className="text-sm text-muted-foreground">Attendance across the last 7 days</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {data.dailyTrends && data.dailyTrends.length > 0 ? (
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Bar dataKey="Breakfast" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Lunch" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Snacks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Dinner" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                            <p>No recent mess logs to display.</p>
                        </div>
                    )}
                </div>

                {/* Special Events Food Preference Pie Chart */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-card-foreground">Food Preferences</h2>
                            <p className="text-sm text-muted-foreground">Overall ratio across Special Events</p>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {(data.foodPreference && data.foodPreference.some((item: any) => item.value > 0)) ? (
                        <div className="h-72 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.foodPreference}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.foodPreference.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <PieChartIcon className="w-8 h-8 mb-2 opacity-50" />
                            <p>No participant data available yet.</p>
                        </div>
                    )}
                </div>

                {/* Peak Scanning Times Line Chart */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-card-foreground">Peak Scanning Times</h2>
                            <p className="text-sm text-muted-foreground">When are tokens scanned the most?</p>
                        </div>
                        <Activity className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {data.peakScanningTimes && data.peakScanningTimes.length > 0 ? (
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data.peakScanningTimes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <RechartsTooltip
                                        cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <Activity className="w-8 h-8 mb-2 opacity-50" />
                            <p>No scanning data available yet.</p>
                        </div>
                    )}
                </div>

                {/* Event Attendance Rate */}
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-card-foreground">Event Attendance Rate</h2>
                            <p className="text-sm text-muted-foreground">Tokens redeemed vs unused</p>
                        </div>
                        <Target className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {data.attendanceRate && data.attendanceRate.length > 0 ? (
                        <div className="h-72 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="40%"
                                    outerRadius="100%"
                                    barSize={20}
                                    data={data.attendanceRate}
                                    startAngle={180}
                                    endAngle={-180}
                                >
                                    <RadialBar
                                        background
                                        dataKey="value"
                                        cornerRadius={10}
                                    />
                                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '14px' }} />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 w-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/20">
                            <Target className="w-8 h-8 mb-2 opacity-50" />
                            <p>No attendance data available yet.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
