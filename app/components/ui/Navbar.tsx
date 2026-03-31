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
        <header className="h-[80px] border-b border-border bg-card/95 backdrop-blur-md px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
            <div>
                <h2 className="text-[1.35rem] font-semibold text-foreground tracking-tight leading-tight">
                    {pageTitle}
                </h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="h-8 w-px bg-border/60" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium leading-none text-foreground">{user?.displayName || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User')}</p>
                        {role !== 'admin' && role !== 'manager' && department && (
                            <p className="text-xs text-muted-foreground mt-1">Dept: {department}</p>
                        )}
                        {(role === 'admin' || role === 'manager') && (
                            <p className="text-xs text-muted-foreground mt-1">{role.toUpperCase()}</p>
                        )}
                    </div>
                    <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <UserCircle className="w-6 h-6 text-primary" />
                    </div>
                </div>
            </div>
        </header>
    );
}
