// provider/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

// Створюємо контекст
const AuthContext = createContext();

// Хук для зручного доступу до контексту
export const useAuth = () => {
    return useContext(AuthContext);
};

// Компонент-провайдер, який обгортає всю програму
export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDriver, setIsDriver] = useState(false);

    // Слухач для змін сесії Supabase
    useEffect(() => {
        // supabase.auth.getSession().then(({ data: { session } }) => {
        //     setSession(session);
        //     setIsLoading(false);
        // });
        // Проблема: .getSession() не слухає зміни в реальному часі.
        // Вирішення: Використовуємо .onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                setSession(session);
                
                // Перевіряємо роль користувача після успішного входу
                if (session) {
                    await checkUserRole(session);
                } else {
                    setIsDriver(false);
                }
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const checkUserRole = async (currentSession) => {
        if (!currentSession?.user) {
            setIsDriver(false);
            return;
        }

        try {
            const { data, error, status } = await supabase
                .from('profiles')
                .select(`role`)
                .eq('id', currentSession.user.id)
                .single();

            if (error && status !== 406) {
                console.error("Error fetching user role:", error.message);
                setIsDriver(false);
            }

            if (data && data.role === 'driver') {
                setIsDriver(true);
            } else {
                setIsDriver(false);
            }
        } catch (error) {
            console.error('Unexpected error fetching user role:', error.message);
            setIsDriver(false);
        }
    };
    
    // Функція входу в систему
    const signIn = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        // Повертаємо об'єкт з даними або помилкою
        return { data, error };
    };

    // Функція реєстрації
    const signUp = async ({ email, password, role }) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role } // Зберігаємо роль в метаданих профілю
            }
        });
        return { data, error };
    };

    // Функція виходу
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = {
        session,
        isLoading,
        isDriver,
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
