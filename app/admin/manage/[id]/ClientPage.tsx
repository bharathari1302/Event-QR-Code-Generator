'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { ArrowLeft, Settings, Loader2, Users, Utensils, FileText, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { FaLeaf, FaDrumstickBite, FaFilePdf, FaTimes } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Stats = Record<string, number>;

type MealParticipant = {
    id: string;
    name: string;
    rollNo: string;
    roomNo: string;
    foodPreference: string;
    status: 'Served' | 'Pending';
    timestamp: string;
};

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner', 'icecream'];

export default function EventFoodStatsPage() {
    const { id: eventId } = useParams() as { id: string };
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();

    const [eventName, setEventName] = useState('Loading event...');
    const [coordinatorsCount, setCoordinatorsCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);

    const [stats, setStats] = useState<Stats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const [selectedMeal, setSelectedMeal] = useState('breakfast');
    const [students, setStudents] = useState<MealParticipant[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [filterFood, setFilterFood] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const [showPdfModal, setShowPdfModal] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'S.No', 'Student Name', 'Roll No', 'Room No', 'Food Pref', 'Status', 'Check-in Time'
    ]);
    const [pdfFilterStatuses, setPdfFilterStatuses] = useState<string[]>(['Served', 'Pending']);

    useEffect(() => {
        if (!authLoading && (!user || role !== 'admin')) {
            router.push('/login');
        }
    }, [user, role, authLoading, router]);

    const fetchEventMeta = async () => {
        if (!eventId) return;
        try {
            const [detailsRes, coordinatorsRes, studentsRes] = await Promise.all([
                fetch(`/api/events/details?eventId=${eventId}`),
                fetch(`/api/events/coordinators?eventId=${eventId}`),
                fetch('/api/students')
            ]);

            const detailsData = await detailsRes.json().catch(() => ({}));
            const coordinatorsData = await coordinatorsRes.json().catch(() => ([]));
            const studentsData = await studentsRes.json().catch(() => ({}));

            if (detailsData?.name) setEventName(detailsData.name);
            if (coordinatorsRes.ok && Array.isArray(coordinatorsData)) {
                setCoordinatorsCount(coordinatorsData.length);
            }
            if (studentsRes.ok && studentsData.success && Array.isArray(studentsData.students)) {
                setTotalStudents(studentsData.students.length);
            }
        } catch (error) {
            console.error('Failed to fetch event meta', error);
        }
    };

    const fetchLiveStats = async () => {
        if (!eventId) return;
        setStatsLoading(true);
        try {
            const res = await fetch(`/api/stats/live?eventId=${eventId}`);
            const data = await res.json();
            if (res.ok && data.stats) {
                setStats(data.stats);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch food stats', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchMealDetails = async () => {
        if (!eventId || !selectedMeal) return;
        setDetailsLoading(true);
        try {
            const res = await fetch(`/api/stats/students-details?eventId=${eventId}&meal=${selectedMeal}`);
            const data = await res.json();
            if (res.ok && data.students) {
                setStudents(data.students);
            }
        } catch (error) {
            console.error('Failed to fetch food detail rows', error);
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        if (!eventId || authLoading || !user) return;
        fetchEventMeta();
        fetchLiveStats();
    }, [eventId, authLoading, user]);

    useEffect(() => {
        if (!eventId) return;
        fetchLiveStats();
        const timer = setInterval(fetchLiveStats, 60000);
        return () => clearInterval(timer);
    }, [eventId]);

    useEffect(() => {
        fetchMealDetails();
        const timer = setInterval(fetchMealDetails, 120000);
        return () => clearInterval(timer);
    }, [eventId, selectedMeal]);

    const getStat = (meal: string, type: 'total' | 'veg' | 'nonveg') => {
        if (!stats) return 0;
        return stats[`${type}_${meal}`] || 0;
    };

    const totalMealsServed = useMemo(() => {
        return MEALS.reduce((sum, meal) => sum + getStat(meal, 'total'), 0);
    }, [stats]);

    const filteredStudents = useMemo(() => {
        return students.filter((p) => {
            const pref = (p.foodPreference || '').toLowerCase();
            const foodMatch =
                filterFood === 'ALL' ||
                (filterFood === 'Veg' && pref.includes('veg') && !pref.includes('non')) ||
                (filterFood === 'Non Veg' && pref.includes('non'));

            const statusMatch = filterStatus === 'ALL' || p.status === filterStatus;
            const searchMatch =
                !searchTerm ||
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.rollNo?.toLowerCase().includes(searchTerm.toLowerCase());

            return foodMatch && statusMatch && searchMatch;
        });
    }, [students, filterFood, filterStatus, searchTerm]);

    const toggleColumn = (col: string) => {
        setSelectedColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
    };

    const togglePdfStatus = (status: string) => {
        setPdfFilterStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    };

    const generatePdf = () => {
        const doc = new jsPDF();

        const pdfRows = filteredStudents.filter((p) => {
            const s = p.status === 'Served' ? 'Served' : 'Pending';
            return pdfFilterStatuses.includes(s);
        });

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(eventName, 14, 20);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Meal: ${selectedMeal.toUpperCase()}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        const body = pdfRows.map((p, idx) => {
            const row: any[] = [];
            if (selectedColumns.includes('S.No')) row.push(idx + 1);
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
            body,
            startY: 40,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 41, 59], fontStyle: 'bold' }
        });

        doc.save(`Food_Stats_${eventName.replace(/\s+/g, '_')}_${selectedMeal}.pdf`);
        setShowPdfModal(false);
    };

    if (authLoading || !user || role !== 'admin') {
        return (
            <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
            </div>
        );
    }

    const availableColumns = ['S.No', 'Student Name', 'Roll No', 'Room No', 'Food Pref', 'Status', 'Check-in Time'];

    return (
        <div className="max-w-7xl mx-auto px-1 sm:px-0 pb-12 space-y-6">
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-gray-200/60 animate-fade-in-up">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/admin/events">
                        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800">Event Food Stats</h1>
                        <p className="text-slate-500 text-sm truncate">{eventName}</p>
                    </div>
                </div>
                <Link href={`/admin/manage/${eventId}/options`}>
                    <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Manage Event Options</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-5 card-premium border-l-4 border-l-indigo-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Event Coordinators</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{coordinatorsCount}</p>
                </div>
                <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-5 card-premium border-l-4 border-l-violet-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Students</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{totalStudents}</p>
                </div>
                <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-5 card-premium border-l-4 border-l-emerald-500">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Meals Served</p>
                    <p className="mt-2 text-3xl font-black text-slate-800">{statsLoading ? '...' : totalMealsServed}</p>
                    <p className="text-xs text-slate-400 mt-1">Updated: {lastUpdated.toLocaleTimeString()}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <h2 className="text-sm font-bold text-slate-800 mb-4">Meal Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {MEALS.map((meal) => (
                        <div key={meal} className="rounded-2xl border border-gray-200/60 bg-white overflow-hidden card-premium">
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-3 text-center">
                                <p className="text-xs font-bold uppercase tracking-wider">{meal}</p>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Total Served</p>
                                <p className="text-3xl font-black text-slate-800">{getStat(meal, 'total')}</p>
                                {!['snacks', 'icecream'].includes(meal) && (
                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                                        <div className="text-center text-emerald-700">
                                            <div className="flex items-center justify-center gap-1 text-xs font-semibold"><FaLeaf /> Veg</div>
                                            <p className="text-lg font-black">{getStat(meal, 'veg')}</p>
                                        </div>
                                        <div className="text-center text-red-600 border-l border-gray-100">
                                            <div className="flex items-center justify-center gap-1 text-xs font-semibold"><FaDrumstickBite /> Non-Veg</div>
                                            <p className="text-lg font-black">{getStat(meal, 'nonveg')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-gray-200/60 rounded-2xl shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <Utensils className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-800">Food Detail Section</h2>
                        <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0" onClick={() => setShowPdfModal(true)}>
                            <FaFilePdf className="mr-2" /> Export PDF
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative min-w-[220px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search name / roll no"
                                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                        <select value={filterFood} onChange={(e) => setFilterFood(e.target.value)} className="px-3 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            <option value="ALL">All Food</option>
                            <option value="Veg">Veg Only</option>
                            <option value="Non Veg">Non-Veg Only</option>
                        </select>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                            <option value="ALL">All Status</option>
                            <option value="Served">Served</option>
                            <option value="Pending">Not Served</option>
                        </select>
                    </div>
                </div>

                <div className="px-5 pt-4 pb-3 flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50/30">
                    {MEALS.map((meal) => (
                        <button
                            key={meal}
                            onClick={() => setSelectedMeal(meal)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase transition-all duration-200 ${selectedMeal === meal ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white border border-gray-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}
                        >
                            {meal}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/60 text-slate-500 uppercase text-[11px] tracking-wider">
                            <tr>
                                <th className="p-3 font-bold">S.No</th>
                                <th className="p-3 font-bold">Student Name</th>
                                <th className="p-3 font-bold">Roll No</th>
                                <th className="p-3 font-bold">Room No</th>
                                <th className="p-3 font-bold">Food Pref</th>
                                <th className="p-3 font-bold">Status</th>
                                <th className="p-3 font-bold">Check-in Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {detailsLoading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading details...</td></tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No records found.</td></tr>
                            ) : (
                                    filteredStudents.map((p, i) => (
                                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="p-3 text-sm text-slate-500">{i + 1}</td>
                                        <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                                        <td className="p-3 text-sm font-mono text-slate-600">{p.rollNo}</td>
                                        <td className="p-3 text-sm text-slate-600">{p.roomNo}</td>
                                        <td className="p-3 text-sm text-slate-600">{['snacks', 'icecream'].includes(selectedMeal) ? '-' : p.foodPreference}</td>
                                        <td className="p-3 text-sm">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.status === 'Served' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/40' : 'bg-amber-50 text-amber-700 border border-amber-200/40'}`}>{p.status}</span>
                                        </td>
                                        <td className="p-3 text-sm text-slate-500">{p.timestamp}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPdfModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200/60 overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-black text-lg text-slate-800">Generate PDF Report</h3>
                            <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-800 transition-colors"><FaTimes /></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <p className="text-sm font-bold text-slate-700 mb-2">Statuses</p>
                                <div className="flex gap-2">
                                    {['Served', 'Pending'].map((s) => (
                                        <label key={s} className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer">
                                            <input type="checkbox" checked={pdfFilterStatuses.includes(s)} onChange={() => togglePdfStatus(s)} className="accent-indigo-600" />
                                            {s === 'Pending' ? 'Not Served' : s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 mb-2">Columns</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableColumns.map((col) => (
                                        <label key={col} className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 text-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-pointer">
                                            <input type="checkbox" checked={selectedColumns.includes(col)} onChange={() => toggleColumn(col)} className="accent-indigo-600" />
                                            {col}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowPdfModal(false)}>Cancel</Button>
                            <Button variant="gradient" onClick={generatePdf} disabled={!selectedColumns.length || !pdfFilterStatuses.length}>
                                <FileText className="w-4 h-4 mr-2" /> Download Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
