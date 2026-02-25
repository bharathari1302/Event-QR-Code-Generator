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
    UserCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from './Button';

export function Sidebar() {
    const { user, role, logout } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    // Fix: Exact match for root paths (dashboard), startsWith for sub-paths
    const isActive = (path: string) => {
        // Special case for 'Events' parent
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
        links.push({ name: 'Users', href: '/admin/users', icon: Users });
        links.push({ name: 'Events', href: '/admin/events', icon: CalendarDays });
        links.push({ name: 'Food Stats', href: '/warden/dashboard', icon: QrCode });
    } else if (role === 'manager') {
        links.push({ name: 'Dashboard', href: '/manager', icon: LayoutDashboard });
        links.push({ name: 'My Events', href: '/manager/events', icon: CalendarDays });
        links.push({ name: 'Food Stats', href: '/warden/dashboard', icon: QrCode });
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
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white text-slate-700 border border-border rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
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
                "fixed left-0 top-0 h-screen w-64 bg-white border-r border-border flex flex-col z-50 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-sm",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area */}
                <div className="h-20 flex items-center gap-3 px-6 border-b border-border bg-slate-50/50">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src="/logo.png" alt="Q-Swift" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg leading-tight text-foreground tracking-tight">Q-Swift</h1>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {role === 'admin' ? 'Administration' : role?.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
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
                                    "relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group text-sm font-medium border border-transparent",
                                    active
                                        ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border-blue-100"
                                        : "hover:bg-slate-100 hover:text-foreground text-muted-foreground"
                                )}
                            >
                                <link.icon className={cn(
                                    "w-5 h-5 transition-colors",
                                    active ? "text-blue-600" : "text-slate-400 group-hover:text-foreground"
                                )} />
                                <span>{link.name}</span>
                                {active && (
                                    <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile & Logout */}
                <div className="p-4 border-t border-border bg-slate-50/30">
                    <div className="mb-4 px-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                            <UserCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-foreground truncate">{user.email?.split('@')[0] || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 text-muted-foreground transition-all text-sm font-medium border border-border shadow-sm hover:border-red-100"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>

                    <div className="mt-4 text-[10px] text-center text-muted-foreground/60">
                        v1.0.0 • Developed by BHARAT HARI S - AIML
                    </div>
                </div>
            </aside>
        </>
    );
}
