import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log("🪵 [AUTH_PROVIDER] Mounting. Setting up auth flow...");

        // ✨ 1. Ця функція виконається ОДИН РАЗ для початкового завантаження
        const initializeAuth = async () => {
            console.log("🪵 [AUTH_PROVIDER] Running initializeAuth function...");
            try {
                // Отримуємо поточну сесію.
                console.log("🪵 [AUTH_PROVIDER] Calling supabase.auth.getSession()...");
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
                console.log(`🪵 [AUTH_PROVIDER] getSession() finished. Session exists: ${!!initialSession}`);
                if (sessionError) {
                    throw new Error(`Session Error: ${sessionError.message}`);
                }
                setSession(initialSession);

                // Якщо сесія є, завантажуємо профіль.
                if (initialSession?.user) {
                    console.log(`🪵 [AUTH_PROVIDER] Initial session found. Fetching profile for user: ${initialSession.user.id}`);
                    const { data, error } = await supabase
                        .from('profiles')
                        .select(`role`)
                        .eq('id', initialSession.user.id)
                        .single();

                    if (error && error.status !== 406) {
                        throw new Error(`Profile Error: ${error.message}`);
                    }
                    setProfile(data || null);
                    console.log(`🪵 [AUTH_PROVIDER] Initial profile fetch successful. Role: ${data?.role || 'null'}`);
                } else {
                    setProfile(null);
                    console.log("🪵 [AUTH_PROVIDER] No initial session, profile set to null.");
                }
            } catch (e) {
                console.error("🪵 [AUTH_PROVIDER] CRITICAL ERROR during initialization:", e.message);
                setSession(null);
                setProfile(null);
            } finally {
                // ✨ 2. ГАРАНТОВАНО вимикаємо завантаження. Це найнадійніший спосіб.
                console.log("🪵 [AUTH_PROVIDER] initializeAuth finished. Calling setIsLoading(false).");
                setIsLoading(false);
            }
        };

        // Запускаємо початкову перевірку
        initializeAuth();

        // ✨ 3. Встановлюємо слухача, який буде реагувати на майбутні зміни (логін/логаут)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                console.log(`🪵 [AUTH_PROVIDER] onAuthStateChange event: ${_event}. Session exists: ${!!session}`);
                setSession(session);
                
                // Оновлюємо профіль, якщо сесія змінилася
                if (session?.user) {
                     const { data } = await supabase.from('profiles').select(`role`).eq('id', session.user.id).single();
                     setProfile(data || null);
                } else {
                     setProfile(null);
                }
            }
        );

        return () => {
            console.log("🪵 [AUTH_PROVIDER] Unmounting. Unsubscribing from auth changes.");
            subscription.unsubscribe();
        };
    }, []);
      
    const signIn = async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    };

    const signUp = async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    };

    const signOut = async () => {
        return await supabase.auth.signOut();
    };

    const value = { session, profile, isLoading, signIn, signUp, signOut };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

