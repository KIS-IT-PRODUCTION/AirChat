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

    // Функція для отримання профілю, винесена для перевикористання
    const getProfile = useCallback(async (userSession) => {
        if (!userSession?.user) {
            console.log("🪵 [AUTH_PROVIDER] No session, clearing profile.");
            setProfile(null);
            return;
        }

        try {
            console.log(`🪵 [AUTH_PROVIDER] Fetching profile for user: ${userSession.user.id}`);
            const { data, error } = await supabase.rpc('get_my_role');
            if (error) throw error;

            setProfile(data || null);
            console.log(`🪵 [AUTH_PROVIDER] Profile loaded. Role: ${data?.role || 'none'}`);
        } catch (error) {
            console.error("🪵 [AUTH_PROVIDER] Error fetching profile:", error.message);
            setProfile(null);
        }
    }, []);

    // ✨ Ключове виправлення: надійний процес ініціалізації
    useEffect(() => {
        let authSubscription = null;

        const initializeAuth = async () => {
            console.log("🪵 [AUTH_PROVIDER] Initializing auth state...");
            setIsLoading(true);

            try {
                // 1. Негайно отримуємо поточну сесію при старті.
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                console.log(`🪵 [AUTH_PROVIDER] Initial session check complete. Session exists: ${!!initialSession}`);
                setSession(initialSession);

                // 2. Одразу завантажуємо профіль для початкової сесії.
                await getProfile(initialSession);

                // 3. Тепер підписуємося на майбутні зміни (вхід, вихід, оновлення токену).
                const { data: { subscription } } = supabase.auth.onAuthStateChange(
                    async (_event, currentSession) => {
                        console.log(`🪵 [AUTH_PROVIDER] Auth event: ${_event}. Session is now: ${currentSession ? 'active' : 'null'}`);
                        setSession(currentSession);
                        // Оновлюємо профіль при кожній зміні сесії.
                        await getProfile(currentSession);
                    }
                );
                authSubscription = subscription;

            } catch (error) {
                console.error("🪵 [AUTH_PROVIDER] Critical error during auth initialization:", error.message);
            } finally {
                // 4. Гарантовано вимикаємо завантаження, щоб уникнути "зависання".
                console.log("🪵 [AUTH_PROVIDER] Auth initialization finished.");
                setIsLoading(false);
            }
        };

        initializeAuth();

        // Функція очищення для відписки
        return () => {
            if (authSubscription) {
                console.log("🪵 [AUTH_PROVIDER] Unsubscribing from auth changes.");
                authSubscription.unsubscribe();
            }
        };
    }, [getProfile]); // Залежність від getProfile

    // Функції signIn, signUp, signOut залишаються майже без змін
    const signIn = useCallback(async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    }, []);

    const signOut = useCallback(async () => {
        return await supabase.auth.signOut();
    }, []);

    const value = { session, profile, isLoading, signIn, signUp, signOut };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};