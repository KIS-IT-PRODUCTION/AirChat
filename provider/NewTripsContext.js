// provider/NewTripsContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const NewTripsContext = createContext();

export const NewTripsProvider = ({ children }) => {
  const { session } = useAuth();
  const [newTripsCount, setNewTripsCount] = useState(0);

  const fetchNewTripsCount = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { count, error } = await supabase
        .from('transfers')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', session.user.id)
        .eq('status', 'accepted')
        .eq('viewed_by_driver', false);
      
      if (error) throw error;
      setNewTripsCount(count || 0);
    } catch (error) {
      console.error('Error fetching new trips count:', error.message);
    }
  }, [session]);

  const clearNewTripsCount = useCallback(async () => {
    if (!session?.user || newTripsCount === 0) return;
    try {
      setNewTripsCount(0); // Оновлюємо UI миттєво
      const { error } = await supabase
        .from('transfers')
        .update({ viewed_by_driver: true })
        .eq('driver_id', session.user.id)
        .eq('status', 'accepted')
        .eq('viewed_by_driver', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing new trips count:', error.message);
    }
  }, [session, newTripsCount]);

  useEffect(() => {
    if (session) {
      fetchNewTripsCount();

      const channel = supabase
        .channel('public:transfers:new_trips_count')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'transfers', filter: `driver_id=eq.${session.user.id}` },
            () => {
                setTimeout(fetchNewTripsCount, 1000); // Невелика затримка для синхронізації
            }
        ).subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchNewTripsCount]);

  return (
    <NewTripsContext.Provider value={{ newTripsCount, clearNewTripsCount }}>
      {children}
    </NewTripsContext.Provider>
  );
};

export const useNewTrips = () => useContext(NewTripsContext);