'use client';

import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    QrCode,
    LogOut,
    Menu,
    X,
    ChevronRight,
    UserCircle,
    Coffee,
    Star,
    PieChart
} from 'lucide-react';
import { useState } from 'react';
import { cn } from './Button';

export function Sidebar() {
    const { user, role, logout } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    const isActive = (path: string) => {
        if (path === '/admin/events' && pathname.includes('/admin/manage/')) {
            return true;
        }
        if (path === '/manager/events' && pathname.includes('/manager/manage/')) {
            return true;
        }

        if (path === '/admin' || path === '/manager' || path === '/warden' || path === '/coordinator') {
            return pathname === path;
        }
        return pathname.startsWith(path);
    };

    const links = [];

    if (role === 'admin') {
        links.push({ name: 'Dashboard', href: '/admin', icon: LayoutDashboard });
        links.push({ name: 'Global Students', href: '/admin/students', icon: Users });
        links.push({ name: 'Forms', href: '/admin/forms', icon: Star });
        links.push({ name: 'System Users', href: '/admin/users', icon: UserCircle });
        links.push({ name: 'Events', href: '/admin/events', icon: CalendarDays });
        links.push({ name: 'Analytics', href: '/admin/analytics', icon: PieChart });
    } else if (role === 'manager') {
        links.push({ name: 'Dashboard', href: '/manager', icon: LayoutDashboard });
        links.push({ name: 'Global Students', href: '/manager/students', icon: Users });
        links.push({ name: 'Events', href: '/manager/events', icon: CalendarDays });
    } else if (role === 'coordinator') {
        links.push({ name: 'Scanner', href: '/coordinator', icon: QrCode });
    } else if (role === 'warden') {
        links.push({ name: 'Dashboard', href: '/warden', icon: LayoutDashboard });
    }

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-900 text-white border border-white/10 rounded-xl shadow-lg hover:bg-slate-800 transition-all duration-200"
                aria-label="Toggle Menu"
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar Overlay (Mobile) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside className={cn(
                "fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area */}
                <div className="h-20 flex items-center gap-3 px-5 border-b border-white/[0.06]">
                    <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-1 shadow-lg">
                        <img src="/logo.png" alt="Q-Swift" className="w-full h-full object-contain rounded-lg" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight text-white tracking-tight">Q-Swift</h1>
                        <span className="text-[10px] text-indigo-300/70 uppercase tracking-wider font-semibold">
                            {role === 'admin' ? 'Administration' : role?.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-4 px-3">
                        Menu
                    </div>
                    {links.map((link) => {
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                    active
                                        ? "bg-gradient-to-r from-indigo-600/90 to-violet-600/90 text-white font-semibold shadow-lg shadow-indigo-500/20"
                                        : "hover:bg-white/[0.06] text-slate-400 hover:text-white"
                                )}
                            >
                                <link.icon className={cn(
                                    "w-[18px] h-[18px] transition-colors flex-shrink-0",
                                    active ? "text-white" : "text-slate-500 group-hover:text-indigo-400"
                                )} />
                                <span>{link.name}</span>
                                {active && (
                                    <ChevronRight className="w-4 h-4 ml-auto text-white/60" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-white/[0.06]">
                    <div className="mb-4 px-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-slate-400">
                            <UserCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white/90 truncate">{user.email?.split('@')[0] || 'User'}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all text-sm font-medium border border-white/[0.06] hover:border-red-500/20"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>

                    <div className="mt-4 text-[10px] text-center text-slate-600">
                        v1.0.0 • Developed by BHARAT HARI S - AIML
                    </div>
                </div>
            </aside>
        </>
    );
}
