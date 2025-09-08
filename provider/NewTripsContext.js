import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const NewTripsContext = createContext();

export const NewTripsProvider = ({ children }) => {
  const { session } = useAuth();
  const [newTripsCount, setNewTripsCount] = useState(0);

  const fetchNewTripsCount = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase.rpc('get_new_trips_count');
      if (error) throw error;
      const count = data || 0;
      setNewTripsCount(count);
    } catch (error) {
      console.error('Error fetching new trips count:', error.message);
    }
  }, [session]);
  
  const clearNewTripsCount = useCallback(async () => {
    if (!session?.user || newTripsCount === 0) return;
    setNewTripsCount(0);
    try {
      await supabase.from('transfers').update({ viewed_by_driver: true }).eq('driver_id', session.user.id).eq('viewed_by_driver', false);
    } catch (error) {
      console.error('Error clearing new trips count:', error.message);
    }
  }, [session, newTripsCount]);

  useEffect(() => {
    if (session) {
      fetchNewTripsCount();
      const channel = supabase.channel('public:transfers:new_trips').on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
        setTimeout(fetchNewTripsCount, 1000);
      }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [session, fetchNewTripsCount]);
  
  const value = { newTripsCount, fetchNewTripsCount, clearNewTripsCount };

  return (
    <NewTripsContext.Provider value={value}>
      {children}
    </NewTripsContext.Provider>
  );
};

export const useNewTrips = () => useContext(NewTripsContext);