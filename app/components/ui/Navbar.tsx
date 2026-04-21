'use client';

import { useAuth } from '@/app/context/AuthContext';
import { UserCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavbarProps {
    title?: string;
}

function formatSegment(segment: string) {
    return segment
        .replace(/\[|\]/g, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPageTitle(pathname: string, fallback?: string) {
    if (fallback) return fallback;

    const cleanPath = pathname.split('?')[0];

    if (cleanPath === '/admin') return 'Admin Dashboard';
    if (cleanPath === '/manager') return 'Manager Dashboard';
    if (cleanPath === '/warden') return 'Warden Dashboard';
    if (cleanPath === '/coordinator') return 'Coordinator Dashboard';

    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const last = segments[segments.length - 1];
    const isIdLike = /^[a-f0-9]{8,}$/i.test(last);

    if (isIdLike && segments.length >= 2) {
        return formatSegment(segments[segments.length - 2]);
    }

    return formatSegment(last);
}

export function Navbar({ title }: NavbarProps) {
    const { user, role, department } = useAuth();
    const pathname = usePathname();
    const [contentHeading, setContentHeading] = useState('');

    useEffect(() => {
        const readHeading = () => {
            const heading = document.querySelector('main h1');
            const headingText = heading?.textContent?.trim() || '';
            setContentHeading(headingText);
        };

        readHeading();

        const main = document.querySelector('main');
        if (!main) return;

        const observer = new MutationObserver(() => {
            readHeading();
        });

        observer.observe(main, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        return () => observer.disconnect();
    }, [pathname]);

    const pageTitle = contentHeading || getPageTitle(pathname, title);

    return (
        <header className="h-[72px] border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
            <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
                    {pageTitle}
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-gray-200/60" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold leading-none text-slate-800">{user?.displayName || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User')}</p>
                        {role !== 'admin' && role !== 'manager' && department && (
                            <p className="text-[11px] text-slate-500 mt-1">Dept: {department}</p>
                        )}
                        {(role === 'admin' || role === 'manager') && (
                            <p className="text-[10px] text-indigo-600 mt-1 font-bold tracking-wider uppercase">{role}</p>
                        )}
                    </div>
                    <div className="h-9 w-9 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full flex items-center justify-center border border-indigo-200/40">
                        <UserCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
            </div>
        </header>
    );
}
