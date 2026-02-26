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
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Food Stats Dashboard</h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live updates • Last refreshed: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        className="px-4 py-2.5 border border-border rounded-lg bg-card shadow-sm font-medium text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                    >
                        {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                        title="Refresh"
                    >
                        <FaSync className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {!selectedEventId && (
                <div className="text-center py-20 bg-card rounded-xl border border-border">
                    <p className="text-muted-foreground">No Events Found</p>
                </div>
            )}

            {/* Meal Stats Cards Grid */}
            <div>
                <h2 className="text-xl font-semibold mb-4 text-foreground">Meal Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {meals.map(meal => (
                        <div key={meal} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-4 text-center">
                                <h3 className="text-lg font-bold uppercase tracking-wider">{meal}</h3>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <p className="text-muted-foreground text-xs uppercase font-semibold mb-2 tracking-wide">Total Served</p>
                                    <p className="text-5xl font-black text-foreground">{getStat(meal, 'total')}</p>
                                </div>

                                {!['snacks', 'icecream'].includes(meal) && (
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                        <div className="text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-green-600 mb-2">
                                                <FaLeaf size={14} />
                                                <span className="text-xs font-bold uppercase tracking-wide">Veg</span>
                                            </div>
                                            <p className="text-2xl font-bold text-green-600">{getStat(meal, 'veg')}</p>
                                        </div>
                                        <div className="text-center border-l border-border">
                                            <div className="flex items-center justify-center gap-1.5 text-red-600 mb-2">
                                                <FaDrumstickBite size={14} />
                                                <span className="text-xs font-bold uppercase tracking-wide">Non-Veg</span>
                                            </div>
                                            <p className="text-2xl font-bold text-red-600">{getStat(meal, 'nonveg')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <DetailedView eventId={selectedEventId} eventName={events.find(e => e.id === selectedEventId)?.name || 'Event'} />
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
    const [searchTerm, setSearchTerm] = useState(''); // Name or Roll No Search

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

        const searchMatch = !searchTerm ||
            (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.rollNo && p.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));

        return foodMatch && statusMatch && searchMatch;
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
            const pStatus = p.status === 'Served' ? 'Served' : 'Pending';
            const statusMatch = pdfFilterStatuses.includes(pStatus);

            const searchMatch = !searchTerm ||
                (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.rollNo && p.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));

            return foodMatch && statusMatch && searchMatch;
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
        <div className="bg-card rounded-xl border border-border overflow-hidden relative shadow-sm">
            <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FaUsers className="text-primary" />
                        </div>
                        Student Details
                    </h2>
                    <button
                        onClick={() => setShowPdfModal(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-red-700 transition-all shadow-sm"
                    >
                        <FaFilePdf /> Export PDF
                    </button>
                </div>

                <div className="flex flex-wrap lg:flex-nowrap gap-3 items-center w-full md:w-auto">
                    {/* Search Field */}
                    <div className="relative w-full lg:w-48">
                        <input
                            type="text"
                            placeholder="Search Name or Roll No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 pl-9 text-sm border border-border rounded-lg bg-card font-medium text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Filters */}
                    <select
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-card font-medium text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        value={filterFood}
                        onChange={(e) => setFilterFood(e.target.value)}
                    >
                        <option value="ALL">All Food</option>
                        <option value="Veg">Veg Only</option>
                        <option value="Non Veg">Non-Veg Only</option>
                    </select>

                    <select
                        className="px-3 py-2 text-sm border border-border rounded-lg bg-card font-medium text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="Served">Served</option>
                        <option value="Pending">Not Served</option>
                    </select>

                    <div className="h-6 w-px bg-border hidden md:block"></div>

                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        {meals.map(meal => (
                            <button
                                key={meal}
                                onClick={() => setSelectedMeal(meal)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold uppercase transition-all whitespace-nowrap
                                        ${selectedMeal === meal
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'}
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
                        <tr className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider font-semibold">
                            <th className="p-4 border-b border-border">S.No</th>
                            <th className="p-4 border-b border-border">Student Name</th>
                            <th className="p-4 border-b border-border">Roll No</th>
                            <th className="p-4 border-b border-border">Room No</th>
                            <th className="p-4 border-b border-border">Food Pref</th>
                            <th className="p-4 border-b border-border">Status</th>
                            <th className="p-4 border-b border-border">Check-in Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredParticipants.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                    No records found for this filter.
                                </td>
                            </tr>
                        ) : (
                            filteredParticipants.map((p, index) => (
                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 text-muted-foreground font-mono text-sm">{index + 1}</td>
                                    <td className="p-4 font-semibold text-foreground">{p.name}</td>
                                    <td className="p-4 text-muted-foreground font-mono text-sm">{p.rollNo}</td>
                                    <td className="p-4 text-muted-foreground">{p.roomNo}</td>
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

            <div className="p-4 bg-muted/30 border-t border-border text-right text-xs text-muted-foreground">
            </div>

            {/* PDF Modal */}
            {showPdfModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-card rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
                        <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                <div className="p-1.5 bg-red-100 rounded">
                                    <FaFilePdf className="text-red-600" />
                                </div>
                                Generate PDF Report
                            </h3>
                            <button onClick={() => setShowPdfModal(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                                <FaTimes size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Status Selection */}
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Select Status</h4>
                                <div className="flex gap-3">
                                    {['Served', 'Pending'].map(status => (
                                        <label key={status} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all flex-1
                                            ${pdfFilterStatuses.includes(status) ? 'ring-2 ring-primary border-transparent bg-primary/5' : 'border-border hover:bg-muted/50 bg-card'}
                                        `}>
                                            <input
                                                type="checkbox"
                                                checked={pdfFilterStatuses.includes(status)}
                                                onChange={() => togglePdfStatus(status)}
                                                className="rounded text-primary focus:ring-primary w-4 h-4"
                                            />
                                            <span className="text-sm font-medium text-foreground">{status === 'Pending' ? 'Not Served' : status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Column Selection */}
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Select Columns</h4>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {availableColumns.map(col => (
                                        <label key={col} className={`flex items-center gap-2.5 text-sm p-3 rounded-lg cursor-pointer border transition-all ${selectedColumns.includes(col) ? 'bg-primary/5 border-primary/30 text-primary font-medium' : 'hover:bg-muted/50 border-border text-foreground'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedColumns.includes(col)}
                                                onChange={() => toggleColumn(col)}
                                                className="rounded text-primary focus:ring-primary w-4 h-4"
                                            />
                                            {col}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 flex justify-end gap-3 border-t border-border">
                            <button
                                onClick={() => setShowPdfModal(false)}
                                className="px-4 py-2 rounded-lg text-foreground hover:bg-muted font-medium transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generatePdf}
                                disabled={selectedColumns.length === 0 || pdfFilterStatuses.length === 0}
                                className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all active:scale-95"
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
