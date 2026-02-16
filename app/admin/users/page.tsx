'use client';

import { useState, useEffect } from 'react';
import { FaUserPlus, FaTrash, FaSpinner, FaArrowLeft } from 'react-icons/fa';
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

    // Fetch Users
    const fetchUsers = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) setUsers(data);
        } catch (e) {
            console.error("Failed to fetch users");
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
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                // Reset Form
                setNewEmail('');
                setNewPassword('');
                setNewRollNo('');
                setNewDepartment('');
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
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
                                                type="email"
                                                required
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="manager@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input
                                                type="password"
                                                required
                                                value={newPassword}
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
                                                type="text"
                                                required
                                                value={newRollNo}
                                                onChange={(e) => setNewRollNo(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                                placeholder="e.g. 21CS001"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                            <select
                                                required
                                                value={newDepartment}
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
                        {/* Staff / Admin List */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-blue-50/50">
                                <h2 className="text-xl font-semibold text-blue-900">Working Staff (Admins & Managers)</h2>
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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.filter(u => u.role === 'admin' || u.role === 'manager').map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                            ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                                                         `}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-800">
                                                        {u.email}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500">
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Just now'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.filter(u => u.role === 'admin' || u.role === 'manager').length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-gray-500">No staff found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Student Coordinators List */}
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
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.filter(u => u.role === 'coordinator').map(u => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-purple-100 text-purple-700">
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-800">
                                                        {u.rollNo}
                                                    </td>
                                                    <td className="p-4 text-gray-600">
                                                        {u.department || '-'}
                                                    </td>
                                                    <td className="p-4 text-sm text-gray-500">
                                                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Just now'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {users.filter(u => u.role === 'coordinator').length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-500">No coordinators found.</td>
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
