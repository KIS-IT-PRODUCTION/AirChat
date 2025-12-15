import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const NewOffersContext = createContext();

export const NewOffersProvider = ({ children }) => {
  const { session } = useAuth();
  const [newOffersCount, setNewOffersCount] = useState(0);

  const fetchNewOffersCount = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.rpc('get_new_offers_count');
      if (error) throw error;
      const count = data || 0;
      setNewOffersCount(count);
    } catch (error) {
      console.error('Error fetching new offers count:', error.message);
    }
  }, [session]);
  
  // Real-time listener as a fallback
  useEffect(() => {
    if (session) {
      fetchNewOffersCount();
      const channel = supabase.channel('public:transfer_offers').on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_offers' }, () => {
        setTimeout(fetchNewOffersCount, 1000);
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [session, fetchNewOffersCount]);
  
  const value = { newOffersCount, fetchNewOffersCount };

  return (
    <NewOffersContext.Provider value={value}>
      {children}
    </NewOffersContext.Provider>
  );
};

export const useNewOffers = () => useContext(NewOffersContext);