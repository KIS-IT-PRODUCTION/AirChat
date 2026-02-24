import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

// Ключ для збереження профілю в пам'яті телефону
const PROFILE_CACHE_KEY = '@cached_user_profile';

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Функція для отримання профілю (з сервера) і запису в кеш
    const getProfile = useCallback(async (userSession) => {
        if (!userSession?.user) {
            setProfile(null);
            await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
            return;
        }
        try {
            const { data, error } = await supabase.rpc('get_my_profile').single();
            if (error) throw error;
            
            setProfile(data || null);
            
            // Зберігаємо отриманий профіль в AsyncStorage
            if (data) {
                await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
            }
        } catch (error) {
            console.error("AuthProvider Error: fetching profile failed.", error.message);
            // Якщо сталася помилка (наприклад, немає інтернету), профіль не скидаємо, 
            // бо ми вже завантажили його з кешу під час ініціалізації
        }
    }, []);
    
useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            setIsLoading(true);

            // 1. ШВИДКИЙ СТАРТ: Спочатку намагаємося дістати профіль з кешу
            try {
                const cachedProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
                if (cachedProfileStr && isMounted) {
                    setProfile(JSON.parse(cachedProfileStr));
                }
            } catch (e) {
                console.error("Failed to load profile from cache", e);
            }

            // 2. Отримуємо сесію (Supabase бере її зі свого локального кешу)
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            
            if (isMounted) {
                setSession(initialSession);
                
                // 🚀 ВАЖЛИВО: Вимикаємо завантаження ОДРАЗУ!
                // Це розблокує екран і пустить юзера в додаток, навіть якщо інтернету немає.
                setIsLoading(false); 
            }

            // 3. ФОНОВЕ ОНОВЛЕННЯ: запускаємо без `await`, щоб не блокувати UI
            if (initialSession) {
                getProfile(initialSession);
            } else {
                if (isMounted) setProfile(null);
                AsyncStorage.removeItem(PROFILE_CACHE_KEY);
            }
        };

        initAuth();

        // 4. Слухаємо зміни стану автентифікації
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                if (isMounted) setSession(currentSession);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []); // <-- Видалили getProfile з залежностей
    useEffect(() => {
        if (session?.user) {
            getProfile(session);
        } else {
            setProfile(null);
        }
    }, [session?.user, getProfile]);

    // Перемикання ролі (оновлюємо і стейт, і кеш)
    const switchRole = useCallback(async (newRole) => {
        try {
            const { data, error } = await supabase.rpc('switch_active_role', { new_role: newRole }).single();
            if (error) throw error;
            
            setProfile(data);
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data)); // Оновлюємо кеш
            
            return { success: true };
        } catch (error) {
            console.error("AuthProvider Error: switching role failed.", error.message);
            return { success: false, error: error.message };
        }
    }, []);

    const signIn = useCallback(async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    }, []);

    // При виході чистимо не лише сесію, а й наш кеш профілю
    const signOut = useCallback(async () => {
        await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
        setProfile(null);
        setSession(null);
        return await supabase.auth.signOut();
    }, []);

    const value = { session, profile, isLoading, signIn, signUp, signOut, switchRole };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};