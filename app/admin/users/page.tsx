'use client';

import { useState, useEffect } from 'react';
import { FaUserPlus, FaTrash, FaSpinner, FaArrowLeft, FaEdit, FaTimes, FaCheck } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

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
    user: User;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [email, setEmail] = useState(user.email || '');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setError('');
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
            if (res.ok) {
                onSaved();
                onClose();
            } else {
                setError(data.error || 'Failed to update.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FaEdit className="text-blue-500" /> Edit Manager
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                        <FaTimes className="text-gray-500" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition"
                    >
                        {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Delete Confirm Dialog ───────────────────────────────────────────────────
function DeleteConfirmDialog({ user, onClose, onDeleted }: {
    user: User;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setDeleting(true);
        setError('');
        try {
            const res = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
            });
            const data = await res.json();
            if (res.ok) {
                onDeleted();
                onClose();
            } else {
                setError(data.error || 'Failed to delete.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setDeleting(false);
        }
    };

    const label = user.role === 'coordinator'
        ? `coordinator ${user.rollNo}`
        : `manager ${user.email}`;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaTrash className="text-red-500 text-xl" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Delete User</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Are you sure you want to delete <span className="font-semibold text-gray-700">{label}</span>? This cannot be undone.
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg text-center">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70 transition"
                    >
                        {deleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ManageUsersPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [newUserRole, setNewUserRole] = useState<'manager' | 'coordinator'>('coordinator');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRollNo, setNewRollNo] = useState('');
    const [newDepartment, setNewDepartment] = useState('');
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modal State
    const [editTarget, setEditTarget] = useState<User | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

    const fetchUsers = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) setUsers(data);
        } catch (e) {
            console.error('Failed to fetch users');
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (!user || role !== 'admin') {
                router.push('/login');
            } else {
                fetchUsers();
            }
        }
    }, [user, role, loading]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setMessage(null);

        try {
            const payload: any = { role: newUserRole };
            if (newUserRole === 'manager') {
                payload.email = newEmail;
                payload.password = newPassword;
            } else {
                payload.rollNo = newRollNo;
                payload.department = newDepartment;
            }

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
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setCreating(false);
        }
    };

    if (loading || (role !== 'admin' && !user)) return <div className="p-10 text-center">Loading...</div>;

    const staffUsers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    const coordinators = users.filter(u => u.role === 'coordinator');

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Modals */}
            {editTarget && (
                <EditManagerModal
                    user={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSaved={fetchUsers}
                />
            )}
            {deleteTarget && (
                <DeleteConfirmDialog
                    user={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDeleted={fetchUsers}
                />
            )}

            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition">
                        <FaArrowLeft className="text-gray-600" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">Manage Users</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Create User Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-8">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <FaUserPlus className="text-blue-500" /> Create New User
                            </h2>

                            {message && (
                                <div className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        value={newUserRole}
                                        onChange={(e) => setNewUserRole(e.target.value as any)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="coordinator">Coordinator</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>

                                {newUserRole === 'manager' ? (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email" required value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="manager@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input
                                                type="password" required value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Roll No</label>
                                            <input
                                                type="text" required value={newRollNo}
                                                onChange={(e) => setNewRollNo(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                                placeholder="E.G. 21CS001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                            <select
                                                required value={newDepartment}
                                                onChange={(e) => setNewDepartment(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Select Department</option>
                                                <option value="CIVIL">CIVIL</option>
                                                <option value="ECE">ECE</option>
                                                <option value="EEE">EEE</option>
                                                <option value="AIDS">AIDS</option>
                                                <option value="AIML">AIML</option>
                                                <option value="MECH">MECH</option>
                                                <option value="MTS">MTS</option>
                                                <option value="IT">IT</option>
                                                <option value="CSE">CSE</option>
                                                <option value="CSD">CSD</option>
                                                <option value="AUTO">AUTO</option>
                                                <option value="CHEM">CHEM</option>
                                                <option value="FT">FT</option>
                                                <option value="M.Sc">M.Sc</option>
                                                <option value="MBA">MBA</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {creating ? <FaSpinner className="animate-spin" /> : 'Create User'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* User Lists */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Staff / Managers */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-blue-50/50">
                                <h2 className="text-xl font-semibold text-blue-900">Working Staff (Admins &amp; Managers)</h2>
                            </div>
                            {fetching ? (
                                <div className="p-10 text-center text-gray-500">Loading users...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">Email</th>
                                                <th className="p-4">Created At</th>
                                                <th className="p-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {staffUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                            ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-800">{u.email}</td>
                                                    <td className="p-4 text-sm text-gray-500">
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Just now'}
                                                    </td>
                                                    <td className="p-4">
                                                        {u.role === 'manager' && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setEditTarget(u)}
                                                                    title="Edit Manager"
                                                                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
                                                                >
                                                                    <FaEdit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setDeleteTarget(u)}
                                                                    title="Delete Manager"
                                                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                                                                >
                                                                    <FaTrash className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {staffUsers.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-500">No staff found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Student Coordinators */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-purple-50/50">
                                <h2 className="text-xl font-semibold text-purple-900">Student Coordinators</h2>
                            </div>
                            {fetching ? (
                                <div className="p-10 text-center text-gray-500">Loading users...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                                            <tr>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">Roll No</th>
                                                <th className="p-4">Department</th>
                                                <th className="p-4">Created At</th>
                                                <th className="p-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {coordinators.map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700">
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-800">{u.rollNo}</td>
                                                    <td className="p-4 text-gray-600">{u.department || '-'}</td>
                                                    <td className="p-4 text-sm text-gray-500">
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Just now'}
                                                    </td>
                                                    <td className="p-4">
                                                        <button
                                                            onClick={() => setDeleteTarget(u)}
                                                            title="Delete Coordinator"
                                                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                                                        >
                                                            <FaTrash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {coordinators.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-gray-500">No coordinators found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
