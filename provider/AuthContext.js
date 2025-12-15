import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Функція для отримання профілю, без змін, вона працює коректно
    const getProfile = useCallback(async (userSession) => {
        if (!userSession?.user) {
            setProfile(null);
            return;
        }
        try {
            const { data, error } = await supabase.rpc('get_my_profile').single();
            if (error) throw error;
            setProfile(data || null);
        } catch (error) {
            console.error("AuthProvider Error: fetching profile failed.", error.message);
            setProfile(null);
        }
    }, []);
    
    // ✨ ОПТИМІЗАЦІЯ: Розділено логіку керування сесією та профілем
    useEffect(() => {
        setIsLoading(true);
        // 1. Отримуємо початкову сесію
        supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
            setSession(initialSession);
            // Завантажуємо профіль тільки після отримання початкової сесії
            getProfile(initialSession).finally(() => {
                setIsLoading(false);
            });
        });

        // 2. Слухаємо зміни стану автентифікації.
        // Цей слухач тепер ТІЛЬКИ оновлює стан сесії, не викликаючи зайвих завантажень профілю.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                setSession(currentSession);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

   useEffect(() => {
    if (session?.user) {
        getProfile(session);
    } else {
        setProfile(null);
    }
    // 👇 Змінено залежність з [session] на [session?.user]
}, [session?.user, getProfile]);


    // Функція для перемикання ролі, без змін
    const switchRole = useCallback(async (newRole) => {
        try {
            const { data, error } = await supabase.rpc('switch_active_role', { new_role: newRole }).single();
            if (error) throw error;
            setProfile(data);
            return { success: true };
        } catch (error) {
            console.error("AuthProvider Error: switching role failed.", error.message);
            return { success: false, error: error.message };
        }
    }, []);

    // Функції signIn, signUp, signOut, без змін
    const signIn = useCallback(async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    }, []);

    const signOut = useCallback(async () => {
        return await supabase.auth.signOut();
    }, []);

    const value = { session, profile, isLoading, signIn, signUp, signOut, switchRole };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
