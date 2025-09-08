import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications'; // ✨ 1. Імпортуємо Notifications
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const UnreadCountContext = createContext();

export const UnreadCountProvider = ({ children }) => {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // ✨ 2. Створюємо єдину функцію для оновлення стану та бейджа
  const updateCountAndBadge = useCallback(async (count) => {
    setUnreadCount(count);
    console.log(`[BADGE_SYNC] Встановлено бейдж на іконці: ${count}`);
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
      
      // ✨ 3. Використовуємо нашу нову функцію для синхронізації
      await updateCountAndBadge(data);
      
    } catch (error) {
      console.error("[UNREAD_CONTEXT] Помилка завантаження кількості:", error.message);
    }
  }, [session, updateCountAndBadge]);

  useEffect(() => {
    if (!session) {
      updateCountAndBadge(0); // Очищуємо бейдж при виході з акаунту
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

  // Передаємо тільки `unreadCount` та `fetchUnreadCount`
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

