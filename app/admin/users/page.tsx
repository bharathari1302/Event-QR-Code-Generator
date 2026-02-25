'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import {
    Users, UserPlus, ShieldCheck, GraduationCap,
    ArrowRight, Trash2, Pencil, X, Check, Loader2,
    ArrowLeft
} from 'lucide-react';
import { StatCard } from '@/app/components/ui/StatCard';

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
            <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-primary" /> Edit Manager
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            New Password <span className="text-muted-foreground/60 font-normal normal-case">(leave blank to keep)</span>
                        </label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition"
                            placeholder="••••••••" />
                    </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-sm font-medium transition">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
            <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-base font-bold text-card-foreground mb-1">Delete User</h2>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">{label}</span>?
                        <br />This action cannot be undone.
                    </p>
                    {error && <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
                </div>
                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted text-sm font-medium transition">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition">
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
const DEPTS = ['CIVIL', 'ECE', 'EEE', 'AIDS', 'AIML', 'MECH', 'MTS', 'IT', 'CSE', 'CSD', 'AUTO', 'CHEM', 'FT', 'M.Sc', 'MBA'];

const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none text-sm transition";

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
            } else setMessage({ type: 'error', text: data.error });
        } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
        finally { setCreating(false); }
    };

    if (loading || (role !== 'admin' && !user)) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-gray-200 rounded-full mb-4" />
                    <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
            </div>
        );
    }

    const staffUsers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    const managers = users.filter(u => u.role === 'manager');
    const coordinators = users.filter(u => u.role === 'coordinator');

    return (
        <div className="space-y-8">
            {/* Modals */}
            {editTarget && <EditManagerModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={fetchUsers} />}
            {deleteTarget && <DeleteConfirmDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchUsers} />}

            {/* ── Page Title ── matching dashboard style */}
            <div className="flex items-center gap-3">
                <Link href="/admin" className="p-2 rounded-lg border border-border bg-card hover:bg-muted transition shadow-sm">
                    <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Users</h1>
                    <p className="text-muted-foreground mt-1">Create, edit, and remove system accounts.</p>
                </div>
            </div>

            {/* ── Stat Cards ── same layout as dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Total Staff"
                    value={fetching ? '…' : staffUsers.length}
                    icon={ShieldCheck}
                    className="border-l-4 border-l-blue-500"
                />
                <StatCard
                    label="Managers"
                    value={fetching ? '…' : managers.length}
                    icon={Users}
                    className="border-l-4 border-l-green-500"
                />
                <StatCard
                    label="Coordinators"
                    value={fetching ? '…' : coordinators.length}
                    icon={GraduationCap}
                    className="border-l-4 border-l-purple-500"
                />
            </div>

            {/* ── Create + Tables ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Create Form — styled like a Quick Action card */}
                <div className="lg:col-span-1 sticky top-8">
                    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm p-6">
                        {/* card accent hover */}
                        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-lg w-fit">
                                    <UserPlus className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="font-semibold text-lg text-card-foreground">Create New User</h2>
                            </div>

                            {message && (
                                <div className={`px-3 py-2.5 rounded-lg text-sm font-medium
                                    ${message.type === 'success'
                                        ? 'bg-green-50 border border-green-200 text-green-700'
                                        : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Role</label>
                                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as any)} className={inputCls}>
                                        <option value="coordinator">Coordinator</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>

                                {newUserRole === 'manager' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
                                            <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                                                className={inputCls} placeholder="manager@example.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Password</label>
                                            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                                className={inputCls} placeholder="••••••••" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Roll No</label>
                                            <input type="text" required value={newRollNo} onChange={e => setNewRollNo(e.target.value)}
                                                className={`${inputCls} uppercase`} placeholder="E.G. 21CS001" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Department</label>
                                            <select required value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className={inputCls}>
                                                <option value="">Select Department</option>
                                                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}

                                <button type="submit" disabled={creating}
                                    className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 transition shadow-sm">
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    {creating ? 'Creating…' : 'Create User'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Tables */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Staff table */}
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-card-foreground">Working Staff</h2>
                                <p className="text-xs text-muted-foreground">Admins &amp; Managers</p>
                            </div>
                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                                {staffUsers.length}
                            </span>
                        </div>
                        {fetching ? (
                            <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <th className="px-6 py-3 text-left w-28">Role</th>
                                        <th className="px-6 py-3 text-left">Email</th>
                                        <th className="px-6 py-3 text-left w-28">Created</th>
                                        <th className="px-6 py-3 text-center w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {staffUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase
                                                    ${u.role === 'admin'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-blue-100 text-blue-700'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-card-foreground">{u.email}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.role === 'manager' && (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => setEditTarget(u)} title="Edit"
                                                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(u)} title="Delete"
                                                            className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {staffUsers.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm">No staff found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Coordinators table */}
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <GraduationCap className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <h2 className="font-semibold text-card-foreground">Student Coordinators</h2>
                                <p className="text-xs text-muted-foreground">Event scan coordinators</p>
                            </div>
                            <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                                {coordinators.length}
                            </span>
                        </div>
                        {fetching ? (
                            <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        <th className="px-6 py-3 text-left w-32">Role</th>
                                        <th className="px-6 py-3 text-left">Roll No</th>
                                        <th className="px-6 py-3 text-left">Department</th>
                                        <th className="px-6 py-3 text-left w-28">Created</th>
                                        <th className="px-6 py-3 text-center w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {coordinators.map(u => (
                                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700">
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-card-foreground">{u.rollNo}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{u.department || '—'}</td>
                                            <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <button onClick={() => setDeleteTarget(u)} title="Delete"
                                                        className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {coordinators.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">No coordinators found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
