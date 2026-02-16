'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';

type Event = {
    id: string;
    name: string;
    date: string;
    venue: string;
};

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            } else {
                fetchEvents();
            }
        }
    }, [user, role, authLoading, router]);

    // New Event Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', date: '', venue: '' });
    const [creating, setCreating] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/events');
            const text = await res.text();
            try {
                const data = JSON.parse(text);
                if (data.success) {
                    setEvents(data.events);
                }
            } catch (e) {
                console.error('Failed to parse JSON', e);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setFormData({ name: '', date: '', venue: '' });
                setShowForm(false);
                fetchEvents();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
                    <p className="text-muted-foreground mt-1">Manage your events and participants.</p>
                </div>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Event
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold mb-4 text-card-foreground">Create New Event</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Event Name</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                placeholder="e.g. Symposium 2026"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Venue (Optional)</label>
                            <input
                                type="text"
                                className="w-full p-2.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none text-foreground"
                                placeholder="e.g. Main Auditorium"
                                value={formData.venue}
                                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end gap-2 mt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating}
                                isLoading={creating}
                            >
                                Create Event
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Events List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <div key={event.id} className="group bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            <div className="p-6 flex-1">
                                <h3 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">{event.name}</h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {event.date}
                                    </div>
                                    {event.venue && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            {event.venue}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Active
                                </span>
                                <Link href={`/admin/manage/${event.id}`}>
                                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                                        Manage <ExternalLink className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/5">
                            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground">No events found</h3>
                            <p className="text-muted-foreground mt-1">Get started by creating your first event.</p>
                            <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                                Create Event
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
