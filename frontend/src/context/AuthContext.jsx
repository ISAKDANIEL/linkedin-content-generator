import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

function decodeJWT(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('ucc_token');
        if (stored) {
            const payload = decodeJWT(stored);
            if (payload && payload.exp * 1000 > Date.now()) {
                setToken(stored);
                setUser({ id: payload.sub, email: payload.email, name: payload.name });
            } else {
                localStorage.removeItem('ucc_token');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback((jwtToken) => {
        const payload = decodeJWT(jwtToken);
        if (!payload) return false;
        localStorage.setItem('ucc_token', jwtToken);
        setToken(jwtToken);
        setUser({ id: payload.sub, email: payload.email, name: payload.name });
        return true;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('ucc_token');
        setToken(null);
        setUser(null);
    }, []);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
