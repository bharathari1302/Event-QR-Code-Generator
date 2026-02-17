'use client';

import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaSignOutAlt } from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

type Event = {
    id: string;
    name: string;
    date: string;
    venue: string;
};

export default function ManagerDashboard() {
    const { user, role, loading, logout } = useAuth();
    const router = useRouter();

    const [events, setEvents] = useState<Event[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!loading) {
            if (!user || (role !== 'manager' && role !== 'admin')) {
                router.push('/login');
            } else {
                fetchEvents();
            }
        }
    }, [user, role, loading]);

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

    if (loading || !user) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Manager Dashboard</h1>
                        <p className="text-gray-500">Welcome, {user.displayName || user.email}</p>
                    </div>
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition"
                    >
                        <FaSignOutAlt /> Logout
                    </button>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Assigned Events</h2>
                    <p className="text-sm text-gray-500 mb-6">Select an event to upload participants or send invitations.</p>

                    {fetching ? (
                        <p className="text-center py-8 text-gray-500">Loading events...</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map(event => (
                                <div key={event.id} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group">
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">{event.name}</h3>
                                        <div className="text-gray-500 text-sm flex items-center gap-2 mb-1">
                                            <FaCalendarAlt /> {event.date}
                                        </div>
                                        {event.venue && (
                                            <div className="text-gray-500 text-sm flex items-center gap-2 mb-4">
                                                <FaMapMarkerAlt /> {event.venue}
                                            </div>
                                        )}

                                        <div className="border-t border-gray-200 pt-4 mt-2">
                                            <Link href={`/manager/manage/${event.id}`} className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">
                                                Manage Event
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {events.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-400">
                                    No events found. Please ask Admin to assign events.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/food-scanner" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-orange-500 transition group flex flex-col items-center text-center">
                        <div className="bg-orange-100 p-4 rounded-full text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">🍔</span>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800">Food Token Scanner</h3>
                        <p className="text-sm text-gray-500 mt-1">Scan meal coupons for participants</p>
                    </Link>
                </div>

            </div>
        </div>
    );
}
