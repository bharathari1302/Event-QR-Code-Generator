'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaUserShield, FaChartBar, FaQrcode, FaSignOutAlt, FaUtensils, FaUsers, FaCalendarAlt } from 'react-icons/fa';

export default function Sidebar() {
    const { user, role, logout } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    const links = [];

    if (role === 'admin') {
        links.push({ name: 'Dashboard', href: '/admin', icon: FaChartBar });
        links.push({ name: 'Users', href: '/admin/users', icon: FaUsers });
        links.push({ name: 'Events', href: '/admin/events', icon: FaCalendarAlt });
    } else if (role === 'manager') {
        links.push({ name: 'Dashboard', href: '/manager', icon: FaChartBar });
    } else if (role === 'coordinator') {
        links.push({ name: 'Scanner', href: '/coordinator', icon: FaQrcode });
    }

    // Common/Extra links if needed (e.g. Food Scanner is public but maybe useful here?)
    // links.push({ name: 'Food Scanner', href: '/food-scanner', icon: FaUtensils });

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50">
            {/* Logo Area */}
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl font-bold">
                    E
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-tight">EventSystem</h1>
                    <p className="text-xs text-slate-400 capitalize">{role || 'Guest'}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {links.map((link) => {
                    const active = isActive(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                                ${active
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <link.icon className={`text-lg ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                            <span className="font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                    <FaSignOutAlt />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
