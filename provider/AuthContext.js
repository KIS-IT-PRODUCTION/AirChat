// provider/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    // ✨ ЄДИНИЙ ІНДИКАТОР ЗАВАНТАЖЕННЯ:
    // Цей стан керує всім початковим завантаженням.
    // Він стане `false` тільки тоді, коли ми точно знаємо, чи є юзер і який у нього профіль.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Отримуємо початкову сесію, щоб прискорити завантаження.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log(`[AUTH] Подія: ${event}`);
                setSession(session);

                // ✨ ЦЕНТРАЛІЗОВАНЕ ЗАВАНТАЖЕННЯ ПРОФІЛЮ:
                // Якщо сесія є, ми одразу ж завантажуємо профіль тут.
                if (session?.user) {
                    try {
                        const { data, error, status } = await supabase
                            .from('profiles')
                            .select(`role`)
                            .eq('id', session.user.id)
                            .single();

                        if (error && status !== 406) throw error;
                         
                        setProfile(data || null);

                    } catch (error) {
                        console.error("Помилка завантаження профілю:", error.message);
                        setProfile(null); // Якщо профіль не завантажився, скидаємо його
                    }
                } else {
                    // Якщо сесії немає, профілю теж немає.
                    setProfile(null);
                }
                 
                // ✨ ГАРАНТОВАНЕ ВИМКНЕННЯ ЗАВАНТАЖЕННЯ:
                // Індикатор завантаження вимикається в самому кінці, коли всі перевірки завершено.
                // Це вирішує проблему "вічного завантаження".
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);
     
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