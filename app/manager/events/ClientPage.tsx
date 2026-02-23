'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    CalendarDays,
    Users,
    ArrowRight,
    Search,
    Clock,
    Settings,
    Loader2,
    Filter
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';

type Event = {
    id: string;
    name: string;
    date: string;
    venue: string;
};

export default function EventsClientPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!loading) {
            if (!user) router.push('/login');
            else fetchEvents();
        }
    }, [user, loading]);

    const fetchEvents = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (data.success) setEvents(data.events);
        } catch (e) {
            console.error(e);
        } finally {
            setFetching(false);
        }
    };

    const filtered = events.filter(e =>
        e.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">My Events</h1>
                <p className="text-muted-foreground mt-1">Manage all events assigned to you.</p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search events..."
                    className="w-full pl-9 pr-4 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Events Grid */}
            {fetching ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center bg-card border border-dashed border-border rounded-xl">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-muted-foreground font-medium">No events found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term.' : 'Events assigned by the admin will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(event => (
                        <div
                            key={event.id}
                            className="group bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-primary/10 rounded-lg">
                                    <CalendarDays className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-[10px] font-semibold uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                            </div>

                            <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                {event.name}
                            </h3>

                            <div className="space-y-1 mb-4">
                                {event.date && (
                                    <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {event.date}
                                    </div>
                                )}
                                {event.venue && (
                                    <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                                        <Filter className="w-3 h-3" />
                                        {event.venue}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Link href={`/manager/manage/${event.id}`} className="flex-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                                    >
                                        <Settings className="w-3 h-3 mr-1.5" />
                                        Manage
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Count */}
            {!fetching && filtered.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Showing {filtered.length} of {events.length} events
                </p>
            )}
        </div>
    );
}
