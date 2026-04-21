'use client';

import { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import FormBuilder, { FormField } from '@/app/components/ui/FormBuilder';

type Event = {
    id: string;
    name: string;
    eventType?: 'special' | 'daily';
    date: string;
    venue: string;
    isDynamicForm?: boolean;
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
    const [formData, setFormData] = useState<{
        name: string;
        date: string;
        venue: string;
        eventType: 'special' | 'daily';
        isDynamicForm: boolean;
        formFields: FormField[];
    }>({ 
        name: '', 
        date: '', 
        venue: '', 
        eventType: 'special',
        isDynamicForm: false,
        formFields: [] 
    });
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
                setFormData({ 
                    name: '', 
                    date: '', 
                    venue: '', 
                    eventType: 'special',
                    isDynamicForm: false,
                    formFields: []
                });
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Events</h1>
                    <p className="text-slate-500 mt-1">Manage your events and participants.</p>
                </div>
                <Button variant="gradient" onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Event
                </Button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white border border-gray-200/60 p-6 rounded-2xl shadow-sm animate-fade-in-up">
                    <h2 className="text-lg font-bold mb-4 text-slate-800">Create New Event</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Event Type</label>
                            <select
                                className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 transition-all"
                                value={formData.eventType}
                                onChange={e => setFormData({ ...formData, eventType: e.target.value as 'special' | 'daily' })}
                            >
                                <option value="special">Special Event (e.g. Hostel Day)</option>
                                <option value="daily">Daily Mess Facility</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Event Name</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 transition-all"
                                placeholder="e.g. Symposium 2026"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 transition-all"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Venue (Optional)</label>
                            <input
                                type="text"
                                className="w-full p-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 transition-all"
                                placeholder="e.g. Main Auditorium"
                                value={formData.venue}
                                onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            />
                        </div>

                        {/* Dynamic Form Toggle */}
                        <div className="col-span-2 p-4 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 border border-indigo-100/60 rounded-xl mt-2 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">Fetch by Roll No (Global Registration)</h3>
                                <p className="text-sm text-slate-500">Participants enter their Roll No to fetch global details before answering these custom fields.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={formData.isDynamicForm}
                                    onChange={e => setFormData({ ...formData, isDynamicForm: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Form Builder UI */}
                        {formData.isDynamicForm && (
                            <div className="col-span-2 bg-white p-4 border border-gray-200/60 rounded-xl mt-2">
                                <h3 className="font-bold text-lg mb-4 text-slate-800">Dynamic Fields</h3>
                                <FormBuilder 
                                    fields={formData.formFields} 
                                    onChange={(fields) => setFormData({ ...formData, formFields: fields })} 
                                />
                            </div>
                        )}

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
                                variant="gradient"
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
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event, i) => (
                        <div 
                            key={event.id} 
                            className="group bg-white border border-gray-200/60 rounded-2xl shadow-sm card-premium overflow-hidden flex flex-col animate-fade-in-up"
                            style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
                        >
                            {/* Gradient accent top bar */}
                            <div className={`h-1.5 ${event.eventType === 'daily' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} />
                            <div className="p-6 flex-1">
                                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                                    {event.name}
                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${event.eventType === 'daily' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200/40' : 'bg-violet-50 text-violet-700 border border-violet-200/40'}`}>
                                        {event.eventType === 'daily' ? 'Daily Mess' : 'Special Event'}
                                    </span>
                                </h3>
                                <div className="space-y-2 text-sm text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-indigo-400" />
                                        {event.date}
                                    </div>
                                    {event.venue && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-400" />
                                            {event.venue}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                </span>
                                <Link href={`/admin/manage/${event.id}`}>
                                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                        Manage <ExternalLink className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700">No events found</h3>
                            <p className="text-slate-500 mt-1">Get started by creating your first event.</p>
                            <Button variant="gradient" className="mt-4" onClick={() => setShowForm(true)}>
                                Create Event
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
