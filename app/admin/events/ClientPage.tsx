'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import Link from 'next/link';

type Event = {
    id: string;
    name: string;
    date: string;
    venue: string;
};

export default function EventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    // New Event Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', date: '', venue: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/events');
            const text = await res.text();
            console.log('Raw Response:', text); // Log the raw HTML/Text
            try {
                const data = JSON.parse(text);
                if (data.success) {
                    setEvents(data.events);
                }
            } catch (e) {
                console.error('Failed to parse JSON. Server returned:', text);
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
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Your Events</h1>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <FaPlus /> Create New Event
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="bg-white p-6 rounded-xl shadow-lg mb-8 animate-fade-in">
                        <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
                        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full p-2 border rounded-md"
                                    placeholder="e.g. Aventuro 2026"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full p-2 border rounded-md"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Venue (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-md"
                                    placeholder="e.g. Main Auditorium"
                                    value={formData.venue}
                                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Events List */}
                {loading ? (
                    <p className="text-gray-500 text-center py-10">Loading events...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map(event => (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{event.name}</h3>
                                    <div className="text-gray-500 text-sm flex items-center gap-2 mb-1">
                                        <FaCalendarAlt /> {event.date}
                                    </div>
                                    {event.venue && (
                                        <div className="text-gray-500 text-sm flex items-center gap-2 mb-4">
                                            <FaMapMarkerAlt /> {event.venue}
                                        </div>
                                    )}

                                    <div className="border-t pt-4 mt-2 flex justify-between items-center">
                                        <Link href={`/admin/manage/${event.id}`} className="text-blue-600 font-semibold hover:underline">
                                            Manage Participants
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {events.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <p>No events found. Create your first one above!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
