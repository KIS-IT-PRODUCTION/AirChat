// provider/AuthContext.js (Виправлена версія)

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    // Цей стан керує ТІЛЬКИ початковим завантаженням.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Створюємо асинхронну функцію для початкової перевірки
        const initializeAuth = async () => {
            try {
                // 1. Отримуємо початкову сесію. Це важливо для швидкого старту.
                const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error("[AUTH] Помилка отримання початкової сесії:", sessionError.message);
                }

                setSession(initialSession);

                // 2. Якщо сесія є, одразу завантажуємо профіль.
                if (initialSession?.user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select(`role`)
                        .eq('id', initialSession.user.id)
                        .single();

                    if (error && error.status !== 406) {
                        console.error("[AUTH] Помилка завантаження профілю при ініціалізації:", error.message);
                    }
                    setProfile(data || null);
                } else {
                    setProfile(null);
                }

            } catch (e) {
                console.error("[AUTH] Критична помилка при ініціалізації:", e.message);
                // Навіть якщо є помилка, нам потрібно вимкнути завантажувач
                setSession(null);
                setProfile(null);
            } finally {
                // 3. ГАРАНТОВАНО вимикаємо завантаження, коли початкова перевірка завершена.
                // Це вирішує проблему вічного завантаження.
                setIsLoading(false);
            }
        };
        
        // Запускаємо ініціалізацію
        initializeAuth();

        // 4. Тепер встановлюємо слухача, який буде реагувати на майбутні зміни (логін/логаут).
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[AUTH] Подія: ${event}`);
                setSession(session);

                if (session?.user) {
                    // Перезавантажуємо профіль при зміні сесії
                    const { data, error } = await supabase
                        .from('profiles')
                        .select(`role`)
                        .eq('id', session.user.id)
                        .single();
                    
                    if (error && error.status !== 406) {
                        console.error("[AUTH] Помилка завантаження профілю в onAuthStateChange:", error.message);
                    }
                    setProfile(data || null);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);
      
    // Функції signIn, signUp, signOut залишаються без змін
    const signIn = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    };

    const signUp = async ({ email, password, role }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role } }
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};