import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const AuthContext = createContext();

const PROFILE_CACHE_KEY = '@cached_user_profile';

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const getProfile = useCallback(async (userSession) => {
        if (!userSession?.user) {
            setProfile(null);
            await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
            return;
        }
        try {
            const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile').single();
            if (profileError) throw profileError;
            
            let combinedProfile = { ...profileData };

            if (profileData?.role === 'driver') {
                const { data: driverData, error: driverError } = await supabase
                    .from('driver_profiles')
                    .select('status')
                    .eq('id', userSession.user.id)
                    .single();

                if (!driverError && driverData) {
                    combinedProfile = { ...combinedProfile, driverStatus: driverData.status };
                } else {
                     combinedProfile = { ...combinedProfile, driverStatus: 'pending' };
                }
            }
            
            setProfile(combinedProfile);
            
            if (combinedProfile) {
                await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(combinedProfile));
            }
        } catch (error) {
            console.error("AuthProvider Error: fetching profile failed.", error.message);
        }
    }, []);
    
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            setIsLoading(true);

            try {
                const cachedProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
                if (cachedProfileStr && isMounted) {
                    setProfile(JSON.parse(cachedProfileStr));
                }
            } catch (e) {
                console.error("Failed to load profile from cache", e);
            }

            const { data: { session: initialSession } } = await supabase.auth.getSession();
            
            if (isMounted) {
                setSession(initialSession);
                setIsLoading(false); 
            }

            if (initialSession) {
                getProfile(initialSession);
            } else {
                if (isMounted) setProfile(null);
                AsyncStorage.removeItem(PROFILE_CACHE_KEY);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                if (isMounted) setSession(currentSession);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []); 

    useEffect(() => {
        if (session?.user) {
            getProfile(session);
        } else {
            setProfile(null);
        }
    }, [session?.user, getProfile]);

    const switchRole = useCallback(async (newRole) => {
        try {
            const { data: profileData, error: profileError } = await supabase.rpc('switch_active_role', { new_role: newRole }).single();
            if (profileError) throw profileError;
            
            let newProfile = { ...profileData };

             if (newRole === 'driver') {
                 const { data: driverData, error: driverError } = await supabase
                     .from('driver_profiles')
                     .select('status')
                     .eq('id', session.user.id)
                     .single();

                 if (!driverError && driverData) {
                     newProfile = { ...newProfile, driverStatus: driverData.status };
                 } else {
                     newProfile = { ...newProfile, driverStatus: 'pending' };
                 }
             }

            setProfile(newProfile);
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newProfile)); 
            
            return { success: true };
        } catch (error) {
            console.error("AuthProvider Error: switching role failed.", error.message);
            return { success: false, error: error.message };
        }
    }, [session?.user?.id]);

    const signIn = useCallback(async ({ email, password }) => {
        return await supabase.auth.signInWithPassword({ email, password });
    }, []);

    const signUp = useCallback(async ({ email, password, options }) => {
        return await supabase.auth.signUp({ email, password, options });
    }, []);

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