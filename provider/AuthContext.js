// app/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase'; // Import our configured Supabase client

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const authContextValue = {
    // ОНОВЛЕНО: signUp тепер приймає об'єкт з метаданими
    signUp: async ({ email, password, options = {} }) => {
      return supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          // Дані, які будуть використані нашим тригером в базі даних
          data: options.data,
        },
      });
    },
    signIn: async ({ email, password }) => {
      return supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
    },
    signOut: async () => {
      return supabase.auth.signOut();
    },
    session,
    isLoading,
    isAuthenticated: !!session,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);