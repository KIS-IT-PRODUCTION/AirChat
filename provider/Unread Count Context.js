import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const UnreadCountContext = createContext();

export const UnreadCountProvider = ({ children }) => {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const updateCountAndBadge = useCallback(async (count) => {
    const numericCount = count > 0 ? count : 0;
    setUnreadCount(numericCount);
    // ✨ FIX: Додано команду для оновлення бейджа на іконці додатку
    await Notifications.setBadgeCountAsync(numericCount);
    console.log(`[BADGE_SYNC] Встановлено бейдж на іконці: ${numericCount}`);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!session) {
      await updateCountAndBadge(0);
      return;
    }
    try {
      console.log("[UNREAD_CONTEXT] Завантаження загальної кількості непрочитаних...");
      const { data, error } = await supabase.rpc('get_total_unread_count');
      if (error) throw error;
      
      await updateCountAndBadge(data);
      
    } catch (error) {
      console.error("[UNREAD_CONTEXT] Помилка завантаження кількості:", error.message);
    }
  }, [session, updateCountAndBadge]);

  useEffect(() => {
    if (!session) {
      updateCountAndBadge(0);
      return;
    }

    fetchUnreadCount();

    const channel = supabase
      .channel('public:messages:unread_count_provider')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          setTimeout(fetchUnreadCount, 500); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchUnreadCount, updateCountAndBadge]);

  const value = { unreadCount, fetchUnreadCount };

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
};

export const useUnreadCount = () => {
  return useContext(UnreadCountContext);
};