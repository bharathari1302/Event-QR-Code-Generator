'use client';

import { useState, useEffect } from 'react';
import { FaSync, FaUtensils, FaLeaf, FaDrumstickBite, FaUsers, FaFilePdf, FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Stats = {
    [key: string]: number;
};

type Event = {
    id: string;
    name: string;
};

export default function WardenDashboard() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Fetch Events on load
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/events');
                const data = await res.json();
                if (data.success && data.events.length > 0) {
                    setEvents(data.events);
                    setSelectedEventId(data.events[0].id); // Default to first
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchEvents();
    }, []);

    // Fetch Stats with polling
    useEffect(() => {
        if (!selectedEventId) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/stats/live?eventId=${selectedEventId}`);
                const data = await res.json();
                if (data.stats) {
                    setStats(data.stats);
                    setLastUpdated(new Date());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // 5 seconds poll

        return () => clearInterval(interval);
    }, [selectedEventId]);

    const meals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];

    const getStat = (meal: string, type: 'total' | 'veg' | 'nonveg') => {
        if (!stats) return 0;
        return stats[`${type}_${meal}`] || 0;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Warden Dashboard</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Live Food Counter • Updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            className="p-2 border rounded-lg bg-white shadow-sm"
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                        >
                            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <button
                            onClick={() => window.location.reload()} // Simple refresh
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {!selectedEventId && (
                    <div className="text-center py-20 text-gray-500">No Events Found</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
                    {meals.map(meal => (
                        <div key={meal} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col hover:shadow-xl transition-shadow">
                            {/* Header */}
                            <div className="bg-slate-800 text-white p-4 text-center">
                                <h3 className="text-xl font-bold uppercase tracking-wider">{meal}</h3>
                            </div>

                            {/* Body */}
                            <div className="p-6 flex-1 flex flex-col justify-center">
                                <div className="text-center mb-6">
                                    <p className="text-gray-400 text-xs uppercase font-bold mb-1">Total Served</p>
                                    <p className="text-5xl font-black text-slate-800">{getStat(meal, 'total')}</p>
                                </div>

                                {!['snacks', 'icecream'].includes(meal) && (
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                                                <FaLeaf size={12} /> <span className="text-xs font-bold">VEG</span>
                                            </div>
                                            <p className="text-xl font-bold text-green-700">{getStat(meal, 'veg')}</p>
                                        </div>
                                        <div className="text-center border-l">
                                            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                                                <FaDrumstickBite size={12} /> <span className="text-xs font-bold">NON-VEG</span>
                                            </div>
                                            <p className="text-xl font-bold text-red-700">{getStat(meal, 'nonveg')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <DetailedView eventId={selectedEventId} eventName={events.find(e => e.id === selectedEventId)?.name || 'Event'} />
            </div>
        </div>
    );
}

function DetailedView({ eventId, eventName }: { eventId: string, eventName: string }) {
    const [selectedMeal, setSelectedMeal] = useState('breakfast');
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // PENDING is "Not Served" in UI usually, but data is likely "Pending" or undefined?
    // Let's check existing logic: 
    // const statusMatch = filterStatus === 'ALL' || p.status === filterStatus; 
    // And p.status is "Served" or "Pending"? 
    // In db, status is usually "generated" (which means pending for food?) or "served".
    // Wait, let's check standard status. 
    // In `DetailedView`, status is displayed as p.status. 
    // Let's assume values are 'Served' and... something else. 
    // Previous code: `p.status === 'Served' ? ... : ...`. 
    // And `filterStatus` has options 'Served', 'Pending'.
    // If Status is "generated" in DB, the API might map it. 
    // Let's look at `api/stats/details`.
    // Actually, looking at `ClientPage.tsx` mapping:
    // `p.status` defines the color.
    // Let's stick to the values used in the UI filter: 'Served', 'Pending'.

    // PDF Generation State
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'S.No', 'Student Name', 'Roll No', 'Room No', 'Food Pref', 'Status', 'Check-in Time'
    ]);
    // New: Status Filter for PDF
    const [pdfFilterStatuses, setPdfFilterStatuses] = useState<string[]>(['Served', 'Pending']);

    const availableColumns = [
        'S.No', 'Student Name', 'Roll No', 'Room No', 'Food Pref', 'Status', 'Check-in Time'
    ];

    // Filter States
    const [filterFood, setFilterFood] = useState('ALL'); // ALL, Veg, Non Veg
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, Served, Pending

    const toggleColumn = (col: string) => {
        if (selectedColumns.includes(col)) {
            setSelectedColumns(selectedColumns.filter(c => c !== col));
        } else {
            setSelectedColumns([...selectedColumns, col]);
        }
    };

    // Polling for Details
    useEffect(() => {
        if (!eventId) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/stats/details?eventId=${eventId}&meal=${selectedMeal}`);
                const data = await res.json();
                if (data.participants) {
                    setParticipants(data.participants);
                }
            } catch (error) {
                console.error("Error fetching details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
        // Optional: Poll every 10s or just on manual refresh/change
        const interval = setInterval(fetchDetails, 10000);
        return () => clearInterval(interval);

    }, [eventId, selectedMeal]);

    const meals = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];

    // Filter Logic
    const filteredParticipants = participants.filter(p => {
        const foodMatch = filterFood === 'ALL' ||
            (filterFood === 'Veg' && p.foodPreference.toLowerCase().includes('veg') && !p.foodPreference.toLowerCase().includes('non')) ||
            (filterFood === 'Non Veg' && p.foodPreference.toLowerCase().includes('non'));

        const statusMatch = filterStatus === 'ALL' || p.status === filterStatus;

        return foodMatch && statusMatch;
    });

    const togglePdfStatus = (status: string) => {
        if (pdfFilterStatuses.includes(status)) {
            setPdfFilterStatuses(pdfFilterStatuses.filter(s => s !== status));
        } else {
            setPdfFilterStatuses([...pdfFilterStatuses, status]);
        }
    };

    const generatePdf = () => {
        const doc = new jsPDF();

        // 1. Filter Data based on PDF selections (regardless of view filter, or combined?)
        // User likely wants to export based on the modal selection primarily.
        // But should we respect the "Food" filter from the main view? Yes, likely.
        // So: Filter by current `filterFood` AND `pdfFilterStatuses`.

        const pdfData = participants.filter(p => {
            const foodMatch = filterFood === 'ALL' ||
                (filterFood === 'Veg' && p.foodPreference.toLowerCase().includes('veg') && !p.foodPreference.toLowerCase().includes('non')) ||
                (filterFood === 'Non Veg' && p.foodPreference.toLowerCase().includes('non'));

            // Status match based on the checkboxes
            // We assume p.status matches 'Served' or 'Pending' (or whatever isn't Served).
            // Let's normalize: if p.status is 'Served', match 'Served'. Else match 'Pending'.
            const pStatus = p.status === 'Served' ? 'Served' : 'Pending';
            const statusMatch = pdfFilterStatuses.includes(pStatus);

            return foodMatch && statusMatch;
        });

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(eventName, 14, 22);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // Subtitle logic
        const statusText = pdfFilterStatuses.length === 2 ? 'All Statuses' : pdfFilterStatuses.join(', ');
        doc.text(`Meal: ${selectedMeal.toUpperCase()} | Status: ${statusText.toUpperCase()}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

        // Prepare Data
        const tableBody = pdfData.map((p, index) => {
            const row: any[] = [];
            if (selectedColumns.includes('S.No')) row.push(index + 1);
            if (selectedColumns.includes('Student Name')) row.push(p.name);
            if (selectedColumns.includes('Roll No')) row.push(p.rollNo);
            if (selectedColumns.includes('Room No')) row.push(p.roomNo);
            if (selectedColumns.includes('Food Pref')) row.push(p.foodPreference);
            if (selectedColumns.includes('Status')) row.push(p.status);
            if (selectedColumns.includes('Check-in Time')) row.push(p.timestamp || '-');
            return row;
        });

        autoTable(doc, {
            head: [selectedColumns],
            body: tableBody,
            startY: 42,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' }, // Slate-800
        });

        doc.save(`Event_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowPdfModal(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaUsers className="text-blue-600" />
                        Live Detailed Log
                    </h2>
                    <button
                        onClick={() => setShowPdfModal(true)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-1 hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <FaFilePdf /> PDF
                    </button>
                </div>

                <div className="flex flex-wrap md:flex-nowrap gap-4 items-center w-full md:w-auto">
                    {/* Filters */}
                    <select
                        className="p-2 text-sm border rounded-lg bg-gray-50 font-medium text-gray-700"
                        value={filterFood}
                        onChange={(e) => setFilterFood(e.target.value)}
                    >
                        <option value="ALL">All Food</option>
                        <option value="Veg">Veg Only</option>
                        <option value="Non Veg">Non-Veg Only</option>
                    </select>

                    <select
                        className="p-2 text-sm border rounded-lg bg-gray-50 font-medium text-gray-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="Served">Served</option>
                        <option value="Pending">Not Served</option>
                    </select>

                    <div className="h-6 w-px bg-gray-300 hidden md:block"></div>

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        {meals.map(meal => (
                            <button
                                key={meal}
                                onClick={() => setSelectedMeal(meal)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all whitespace-nowrap
                                        ${selectedMeal === meal
                                        ? 'bg-slate-800 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                                    `}
                            >
                                {meal}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                            <th className="p-4 font-bold border-b">S.No</th>
                            <th className="p-4 font-bold border-b">Student Name</th>
                            <th className="p-4 font-bold border-b">Roll No</th>
                            <th className="p-4 font-bold border-b">Room No</th>
                            <th className="p-4 font-bold border-b">Food Pref</th>
                            <th className="p-4 font-bold border-b">Status</th>
                            <th className="p-4 font-bold border-b">Check-in Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredParticipants.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                    No records found for this filter.
                                </td>
                            </tr>
                        ) : (
                            filteredParticipants.map((p, index) => (
                                <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-4 text-gray-500 font-mono text-sm">{index + 1}</td>
                                    <td className="p-4 font-bold text-gray-800">{p.name}</td>
                                    <td className="p-4 text-gray-600 font-mono text-sm">{p.rollNo}</td>
                                    <td className="p-4 text-gray-600">{p.roomNo}</td>
                                    <td className="p-4">
                                        {['snacks', 'icecream'].includes(selectedMeal) ? (
                                            <span className="text-gray-400 text-sm">-</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-xs font-bold
                                                    ${p.foodPreference.toLowerCase().includes('veg') && !p.foodPreference.toLowerCase().includes('non')
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'}
                                                `}>
                                                {p.foodPreference}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                                ${p.status === 'Served'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-yellow-100 text-yellow-700'}
                                            `}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm whitespace-nowrap">
                                        {p.timestamp}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right text-xs text-gray-400">
                Displaying {filteredParticipants.length} records • Auto-refreshing
            </div>

            {/* PDF Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <FaFilePdf className="text-red-600" />
                                Generate PDF Report
                            </h3>
                            <button onClick={() => setShowPdfModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Status Selection */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Select Status</h4>
                                <div className="flex gap-4">
                                    {['Served', 'Pending'].map(status => (
                                        <label key={status} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer border-gray-200 hover:bg-gray-50 bg-white transition-all
                                            ${pdfFilterStatuses.includes(status) ? 'ring-2 ring-blue-500 border-transparent' : ''}
                                        `}>
                                            <input
                                                type="checkbox"
                                                checked={pdfFilterStatuses.includes(status)}
                                                onChange={() => togglePdfStatus(status)}
                                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{status === 'Pending' ? 'Not Served' : status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Column Selection */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Select Columns</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {availableColumns.map(col => (
                                        <label key={col} className={`flex items-center gap-3 text-sm p-3 rounded-lg cursor-pointer border transition-all ${selectedColumns.includes(col) ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'hover:bg-gray-50 border-gray-100 text-gray-600'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedColumns.includes(col)}
                                                onChange={() => toggleColumn(col)}
                                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-gray-300"
                                            />
                                            {col}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t">
                            <button
                                onClick={() => setShowPdfModal(false)}
                                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generatePdf}
                                disabled={selectedColumns.length === 0 || pdfFilterStatuses.length === 0}
                                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all active:scale-95"
                            >
                                <FaFilePdf /> Download Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
