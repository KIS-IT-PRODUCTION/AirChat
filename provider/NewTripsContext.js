import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';
// ❌ ВИДАЛЕНО: Цей імпорт викликає помилку, бо провайдер знаходиться поза навігацією.
// import { useFocusEffect } from '@react-navigation/native'; 

const NewTripsContext = createContext();

export const NewTripsProvider = ({ children }) => {
  const { session } = useAuth();
  const [newTripsCount, setNewTripsCount] = useState(0);

  const fetchNewTripsCount = useCallback(async () => {
    if (!session?.user) {
      setNewTripsCount(0); // Скидаємо, якщо користувач вийшов
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_new_trips_count');
      if (error) throw error;
      setNewTripsCount(data || 0);
    } catch (error) {
      console.error('Error fetching new trips count:', error.message);
    }
  }, [session]);

  // ❌ ВИДАЛЕНО: Хук useFocusEffect був тут і викликав помилку.
  // Глобальний провайдер не повинен залежати від фокусування на екранах.
  
  const clearNewTripsCount = useCallback(async () => {
    if (!session?.user || newTripsCount === 0) return;
    
    setNewTripsCount(0); 
    
    try {
      const { error } = await supabase
        .from('transfers')
        .update({ viewed_by_driver: true })
        .eq('accepted_driver_id', session.user.id)
        .eq('viewed_by_driver', false);

      if (error) {
        console.error('Error clearing new trips count in DB:', error.message);
        fetchNewTripsCount(); 
      }
    } catch (e) {
      console.error('Network/Catch error on clearing new trips count:', e.message);
      fetchNewTripsCount(); 
    }
  }, [session, newTripsCount, fetchNewTripsCount]);

  // Цей хук є правильним для оновлення даних у глобальному контексті.
  // Він завантажує дані при вході та підписується на real-time зміни.
  useEffect(() => {
    if (session?.user) {
      fetchNewTripsCount(); 

      const channel = supabase
        .channel('public:transfers:new_trips')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transfers',
            filter: `accepted_driver_id=eq.${session.user.id}`
          },
          (payload) => {
             if (payload.new.viewed_by_driver === false) {
                console.log('New trip assigned, fetching count...');
                fetchNewTripsCount();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
        setNewTripsCount(0);
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