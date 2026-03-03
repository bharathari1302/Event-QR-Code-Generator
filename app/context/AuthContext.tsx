'use client';

import { createContext, useContext, useEffect, useState } from 'react';
export interface User {
    uid: string;
    email: string | null;
    displayName?: string | null;
    [key: string]: any;
}
// import { db } from '@/lib/firebase'; // Client SDK no longer needed here
// import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'warden' | 'food_scanner' | null;

if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.__fetchIntercepted) {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            let [resource, config] = args;

            if (typeof resource === 'string' && resource.startsWith('/api/')) {
                config = config || {};

                // Use win.__globalAdminId instead of closure state to survive HMR
                const currentAdminId = win.__globalAdminId;
                if (currentAdminId) {
                    if (config.headers instanceof Headers) {
                        if (!config.headers.has('x-admin-id')) {
                            config.headers.append('x-admin-id', currentAdminId);
                        }
                    } else {
                        config.headers = {
                            ...config.headers,
                            'x-admin-id': currentAdminId
                        } as Record<string, string>;
                    }
                }
            }

            return originalFetch(resource, config);
        };
        win.__fetchIntercepted = true;
    }
}

interface AuthContextType {
    user: User | null;
    role: UserRole;
    department: string | null;
    eventId: string | null;
    eventMeals: string[];
    adminId: string | null;
    adminDetails: { name: string, email: string } | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    coordinatorLogin: (rollNo: string, otp: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    department: null,
    eventId: null,
    eventMeals: [],
    adminId: null,
    adminDetails: null,
    loading: true,
    login: async () => { },
    coordinatorLogin: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [department, setDepartment] = useState<string | null>(null);
    const [eventId, setEventId] = useState<string | null>(null);
    const [eventMeals, setEventMeals] = useState<string[]>([]);
    const [adminId, setAdminId] = useState<string | null>(null);
    const [adminDetails, setAdminDetails] = useState<{ name: string, email: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Synchronously update global adminId
    if (typeof window !== 'undefined') {
        (window as any).__globalAdminId = adminId;
    }

    useEffect(() => {
        const initAuth = async () => {
            // Check for Admin/Manager Session
            const adminSession = localStorage.getItem('admin_session');
            if (adminSession) {
                try {
                    const data = JSON.parse(adminSession);
                    setUser({ uid: data.uid, email: data.email, displayName: data.role } as any);
                    setRole(data.role);
                    setDepartment(data.department);
                    setAdminId(data.adminId || data.uid);
                    setAdminDetails(data.adminDetails || null);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Error parsing admin session", e);
                    localStorage.removeItem('admin_session');
                }
            }

            // Check for Coordinator Session
            const coordSession = localStorage.getItem('coordinator_session');
            if (coordSession) {
                try {
                    const data = JSON.parse(coordSession);
                    setUser({ uid: data.rollNo, email: null } as any);
                    setRole('coordinator');
                    setDepartment(data.department);
                    setEventId(data.eventId || null);
                    setEventMeals(data.eventMeals || []);
                    setAdminId(data.adminId || null);
                    setAdminDetails(data.adminDetails || null);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Error parsing coordinator session", e);
                    localStorage.removeItem('coordinator_session');
                }
            }

            setLoading(false);
        };

        if (typeof window !== 'undefined') {
            initAuth();
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            const userData = data.user;
            const sessionData = {
                uid: userData.uid,
                email: userData.email,
                role: userData.role,
                department: userData.department,
                adminId: userData.adminId || userData.uid, // Admin is their own adminId
                adminDetails: userData.adminDetails || null
            };

            localStorage.setItem('admin_session', JSON.stringify(sessionData));

            setUser({ uid: userData.uid, email: userData.email, displayName: userData.role } as any);
            setRole(userData.role);
            setDepartment(userData.department);
            setAdminId(sessionData.adminId);
            setAdminDetails(sessionData.adminDetails);

            if (userData.role === 'admin') router.push('/admin');
            else router.push('/warden');

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const coordinatorLogin = async (rollNo: string, otp: string) => {
        try {
            const res = await fetch('/api/auth/coordinator-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollNo, otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            const userData = data.user;

            const sessionData = {
                rollNo: userData.rollNo,
                department: userData.department,
                role: 'coordinator',
                eventId: userData.eventId,
                eventMeals: userData.eventMeals,
                adminId: userData.adminId,
                adminDetails: userData.adminDetails
            };
            localStorage.setItem('coordinator_session', JSON.stringify(sessionData));

            setUser({ uid: userData.rollNo, email: null } as any);
            setRole('coordinator');
            setDepartment(userData.department);
            setEventId(userData.eventId || null);
            setEventMeals(userData.eventMeals || []);
            setAdminId(userData.adminId || null);
            setAdminDetails(userData.adminDetails || null);

            router.push('/food-scanner');
        } catch (error) {
            console.error("Coordinator Login Error", error);
            throw error;
        }
    };

    const logout = async () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('coordinator_session');
        setUser(null);
        setRole(null);
        setDepartment(null);
        setEventId(null);
        setEventMeals([]);
        setAdminId(null);
        setAdminDetails(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, role, department, eventId, eventMeals, adminId, adminDetails, loading, login, coordinatorLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
