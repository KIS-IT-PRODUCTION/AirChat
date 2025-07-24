// app/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../config/supabase'; // Import our configured Supabase client

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session on app startup
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    fetchSession();

    // Listen for auth state changes (login, logout, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the listener on unmount
    return () => subscription.unsubscribe();
  }, []);

  const authContextValue = {
    // Function to sign up a new user
    signUp: async ({ email, password }) => {
      return supabase.auth.signUp({
        email: email,
        password: password,
      });
    },
    // Function to sign in an existing user
    signIn: async ({ email, password }) => {
      return supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
    },
    // Function to sign out the current user
    signOut: async () => {
      return supabase.auth.signOut();
    },
    session,
    isLoading,
    isAuthenticated: !!session, // User is authenticated if a session exists
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);