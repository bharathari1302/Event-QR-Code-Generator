'use client';

import { useAuth } from '@/app/context/AuthContext';
import { Bell, Search, UserCircle } from 'lucide-react';
import { Button } from './Button';

interface NavbarProps {
    title?: string;
}

export function Navbar({ title }: NavbarProps) {
    const { user, role, department } = useAuth();

    return (
        <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
            {/* Left: Title / Breadcrumbs */}
            <div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {title || 'Dashboard'}
                </h2>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4">
                {/* Search Bar (Optional, can be expanded) */}
                <div className="hidden md:flex items-center bg-muted/50 px-3 py-1.5 rounded-md border border-transparent focus-within:border-ring/20 transition-all">
                    <Search className="w-4 h-4 text-muted-foreground mr-2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-sm w-48 text-foreground placeholder:text-muted-foreground"
                    />
                </div>

                <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </Button>

                <div className="h-8 w-px bg-border/60 mx-1" />

                <div className="flex items-center gap-3 pl-1">
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
