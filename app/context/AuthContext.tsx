'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
// import { db } from '@/lib/firebase'; // Client SDK no longer needed here
// import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'manager' | 'coordinator' | 'warden' | 'food_scanner' | null;

interface AuthContextType {
    user: User | null;
    role: UserRole;
    department: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    coordinatorLogin: (rollNo: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    department: null,
    loading: true,
    login: async () => { },
    coordinatorLogin: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [department, setDepartment] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error("Error parsing coordinator session", e);
                    localStorage.removeItem('coordinator_session');
                }
            }

            setLoading(false);
        };

        initAuth();
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
                department: userData.department
            };

            localStorage.setItem('admin_session', JSON.stringify(sessionData));

            setUser({ uid: userData.uid, email: userData.email, displayName: userData.role } as any);
            setRole(userData.role);
            setDepartment(userData.department);

            if (userData.role === 'admin') router.push('/admin');
            else router.push('/warden');

        } catch (error) {
            console.error("Login Error:", error);
            throw error;
        }
    };

    const coordinatorLogin = async (rollNo: string) => {
        try {
            const res = await fetch('/api/auth/coordinator-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rollNo }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            const userData = data.user;

            const sessionData = {
                rollNo: userData.rollNo,
                department: userData.department,
                role: 'coordinator'
            };
            localStorage.setItem('coordinator_session', JSON.stringify(sessionData));

            setUser({ uid: userData.rollNo, email: null } as any);
            setRole('coordinator');
            setDepartment(userData.department);

            router.push('/coordinator');
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
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, role, department, loading, login, coordinatorLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
