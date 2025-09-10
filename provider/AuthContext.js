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

    // ✨ 1. Оновлюємо функцію для отримання профілю
    // Тепер вона викликає 'get_my_profile' і отримує більше даних (role, is_driver, etc.)
    const getProfile = useCallback(async (userSession) => {
        if (!userSession?.user) {
            console.log("🪵 [AUTH_PROVIDER] No session, clearing profile.");
            setProfile(null);
            return;
        }

        try {
            console.log(`🪵 [AUTH_PROVIDER] Fetching profile for user: ${userSession.user.id}`);
            const { data, error } = await supabase.rpc('get_my_profile').single();
            if (error) throw error;

            setProfile(data || null);
            console.log(`🪵 [AUTH_PROVIDER] Profile loaded. Role: ${data?.role}, Is Driver: ${data?.is_driver}`);
        } catch (error) {
            console.error("🪵 [AUTH_PROVIDER] Error fetching profile:", error.message);
            setProfile(null);
        }
    }, []);

    // Ваша надійна логіка ініціалізації залишається без змін,
    // оскільки вона коректно обробляє вхід, вихід та оновлення сесії.
    useEffect(() => {
        let authSubscription = null;

        const initializeAuth = async () => {
            console.log("🪵 [AUTH_PROVIDER] Initializing auth state...");
            setIsLoading(true);

            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                console.log(`🪵 [AUTH_PROVIDER] Initial session check complete. Session exists: ${!!initialSession}`);
                setSession(initialSession);
                await getProfile(initialSession);

                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (_event, currentSession) => {
                        console.log(`🪵 [AUTH_PROVIDER] Auth event: ${_event}. Session is now: ${currentSession ? 'active' : 'null'}`);
                        setSession(currentSession);
                        await getProfile(currentSession);
                    }
                );
                authSubscription = subscription;

            } catch (error) {
                console.error("🪵 [AUTH_PROVIDER] Critical error during auth initialization:", error.message);
            } finally {
                console.log("🪵 [AUTH_PROVIDER] Auth initialization finished.");
                setIsLoading(false);
            }
        };

        initializeAuth();

        return () => {
            if (authSubscription) {
                console.log("🪵 [AUTH_PROVIDER] Unsubscribing from auth changes.");
                authSubscription.unsubscribe();
            }
        };
    }, [getProfile]);

    // ✨ 2. Додаємо нову функцію для перемикання ролі
    const switchRole = useCallback(async (newRole) => {
        console.log(`[AUTH_PROVIDER] Attempting to switch role to: ${newRole}`);
        try {
            // Викликаємо SQL-функцію, яка безпечно оновить роль
            const { data, error } = await supabase.rpc('switch_active_role', { new_role: newRole }).single();
            if (error) throw error;
            
            // Миттєво оновлюємо стан профілю в додатку новими даними з сервера
            setProfile(data);
            console.log(`[AUTH_PROVIDER] Role switched successfully. New active role: ${data.role}`);
            return { success: true };
        } catch (error) {
            console.error("[AUTH_PROVIDER] Error switching role:", error.message);
            return { success: false, error: error.message };
        }
    }, []); // Ця функція не має залежностей

    // Функції signIn, signUp, signOut залишаються без змін
    const signIn = useCallback(async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    }, []);

    const signOut = useCallback(async () => {
        return await supabase.auth.signOut();
    }, []);

    // ✨ 3. Додаємо `switchRole` до загального контексту
    const value = { session, profile, isLoading, signIn, signUp, signOut, switchRole };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

