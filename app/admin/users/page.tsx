'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import {
    FaUserPlus, FaTrash, FaSpinner, FaArrowLeft,
    FaEdit, FaTimes, FaCheck, FaUsers, FaUserGraduate
} from 'react-icons/fa';

type User = {
    id: string;
    email?: string;
    rollNo?: string;
    role: 'admin' | 'manager' | 'coordinator';
    department?: string;
    createdAt: any;
};

// ── Edit Modal ──────────────────────────────────────────────────────────────
function EditManagerModal({ user, onClose, onSaved }: {
    user: User; onClose: () => void; onSaved: () => void;
}) {
    const [email, setEmail] = useState(user.email || '');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true); setError('');
        try {
            const payload: any = { userId: user.id };
            if (email !== user.email) payload.email = email;
            if (password) payload.password = password;

            const res = await fetch('/api/admin/users/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) { onSaved(); onClose(); }
            else setError(data.error || 'Failed to update.');
        } catch (e: any) { setError(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FaEdit className="text-blue-500" /> Edit Manager
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                        <FaTimes size={14} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            New Password <span className="text-gray-400 normal-case font-normal">(leave blank to keep)</span>
                        </label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition"
                            placeholder="••••••••" />
                    </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition">
                        {saving ? <FaSpinner className="animate-spin" /> : <FaCheck size={12} />}
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteConfirmDialog({ user, onClose, onDeleted }: {
    user: User; onClose: () => void; onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setDeleting(true); setError('');
        try {
            const res = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });
            const data = await res.json();
            if (res.ok) { onDeleted(); onClose(); }
            else setError(data.error || 'Failed to delete.');
        } catch (e: any) { setError(e.message); }
        finally { setDeleting(false); }
    };

    const label = user.role === 'coordinator' ? `${user.rollNo} (${user.department})` : user.email;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaTrash className="text-red-500" size={16} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">Delete User</h2>
                    <p className="text-sm text-gray-500">
                        Are you sure you want to delete <span className="font-semibold text-gray-700">{label}</span>?
                        <br />This action cannot be undone.
                    </p>
                    {error && <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition">
                        {deleting ? <FaSpinner className="animate-spin" /> : <FaTrash size={12} />}
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Shared field components ─────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-gray-50 focus:bg-white transition";

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ManageUsersPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [fetching, setFetching] = useState(true);

    const [newUserRole, setNewUserRole] = useState<'manager' | 'coordinator'>('coordinator');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRollNo, setNewRollNo] = useState('');
    const [newDepartment, setNewDepartment] = useState('');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [editTarget, setEditTarget] = useState<User | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

    const fetchUsers = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) setUsers(data);
        } catch { /* ignore */ }
        finally { setFetching(false); }
    };

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') router.push('/login');
            else fetchUsers();
        }
    }, [user, role, loading]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true); setMessage(null);
        try {
            const payload: any = { role: newUserRole };
            if (newUserRole === 'manager') { payload.email = newEmail; payload.password = newPassword; }
            else { payload.rollNo = newRollNo; payload.department = newDepartment; }

            const res = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setNewEmail(''); setNewPassword(''); setNewRollNo(''); setNewDepartment('');
                fetchUsers();
            } else {
                setMessage({ type: 'error', text: data.error });
            }
        } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
        finally { setCreating(false); }
    };

    if (loading || (role !== 'admin' && !user)) return <div className="p-10 text-center text-gray-500">Loading…</div>;

    const staffUsers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    const coordinators = users.filter(u => u.role === 'coordinator');

    const depts = ['CIVIL', 'ECE', 'EEE', 'AIDS', 'AIML', 'MECH', 'MTS', 'IT', 'CSE', 'CSD', 'AUTO', 'CHEM', 'FT', 'M.Sc', 'MBA'];

    return (
        <div className="min-h-screen bg-slate-50">
            {editTarget && <EditManagerModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchUsers} />}
            {deleteTarget && <DeleteConfirmDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchUsers} />}

            <div className="max-w-6xl mx-auto px-8 py-8">
                {/* Inline page title */}
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/admin" className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition shadow-sm">
                        <FaArrowLeft className="text-gray-500" size={13} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Create and manage system accounts</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* ── Left: Create Form ── */}
                    <div className="lg:col-span-1 sticky top-8">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Card header */}
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FaUserPlus className="text-blue-600" size={14} />
                                </div>
                                <h2 className="text-base font-semibold text-gray-800">Create New User</h2>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                {message && (
                                    <div className={`px-3 py-2.5 rounded-lg text-sm font-medium
                                        ${message.type === 'success'
                                            ? 'bg-green-50 border border-green-200 text-green-700'
                                            : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <Field label="Role">
                                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className={inputCls}>
                                        <option value="coordinator">Coordinator</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </Field>

                                {newUserRole === 'manager' ? (
                                    <>
                                        <Field label="Email">
                                            <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                                className={inputCls} placeholder="manager@example.com" />
                                        </Field>
                                        <Field label="Password">
                                            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                                className={inputCls} placeholder="••••••••" />
                                        </Field>
                                    </>
                                ) : (
                                    <>
                                        <Field label="Roll No">
                                            <input type="text" required value={newRollNo} onChange={e => setNewRollNo(e.target.value)}
                                                className={`${inputCls} uppercase`} placeholder="E.G. 21CS001" />
                                        </Field>
                                        <Field label="Department">
                                            <select required value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className={inputCls}>
                                                <option value="">Select Department</option>
                                                {depts.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </Field>
                                    </>
                                )}

                                <button type="submit" disabled={creating}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 transition shadow-sm">
                                    {creating ? <FaSpinner className="animate-spin" /> : <FaUserPlus size={13} />}
                                    {creating ? 'Creating…' : 'Create User'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ── Right: Tables ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Staff table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <FaUsers className="text-blue-600" size={14} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800">Working Staff</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Admins &amp; Managers</p>
                                </div>
                                <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full">
                                    {staffUsers.length}
                                </span>
                            </div>
                            {fetching ? (
                                <div className="p-10 text-center text-gray-400 flex items-center justify-center gap-2 text-sm">
                                    <FaSpinner className="animate-spin" /> Loading…
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                            <th className="px-6 py-3 text-left w-28">Role</th>
                                            <th className="px-6 py-3 text-left">Email</th>
                                            <th className="px-6 py-3 text-left w-28">Created</th>
                                            <th className="px-6 py-3 text-center w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {staffUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase
                                                        ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">{u.email}</td>
                                                <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.role === 'manager' && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => setEditTarget(u)} title="Edit"
                                                                className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition">
                                                                <FaEdit size={12} />
                                                            </button>
                                                            <button onClick={() => setDeleteTarget(u)} title="Delete"
                                                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                                                                <FaTrash size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {staffUsers.length === 0 && (
                                            <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 text-sm">No staff found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Coordinators table */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <FaUserGraduate className="text-purple-600" size={14} />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-800">Student Coordinators</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">Event scan coordinators</p>
                                </div>
                                <span className="ml-auto text-xs font-semibold bg-purple-100 text-purple-600 px-2.5 py-1 rounded-full">
                                    {coordinators.length}
                                </span>
                            </div>
                            {fetching ? (
                                <div className="p-10 text-center text-gray-400 flex items-center justify-center gap-2 text-sm">
                                    <FaSpinner className="animate-spin" /> Loading…
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                            <th className="px-6 py-3 text-left w-32">Role</th>
                                            <th className="px-6 py-3 text-left">Roll No</th>
                                            <th className="px-6 py-3 text-left">Department</th>
                                            <th className="px-6 py-3 text-left w-28">Created</th>
                                            <th className="px-6 py-3 text-center w-20">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {coordinators.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-800">{u.rollNo}</td>
                                                <td className="px-6 py-4 text-gray-500">{u.department || '—'}</td>
                                                <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <button onClick={() => setDeleteTarget(u)} title="Delete"
                                                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                                                            <FaTrash size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {coordinators.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No coordinators found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
