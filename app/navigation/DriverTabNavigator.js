// app/navigation/DriverTabNavigator.js
import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase'; // ✨ Імпорт
import { useAuth } from '../../provider/AuthContext'; // ✨ Імпорт

// Імпортуємо екрани та стеки для водія
import DriverHomeScreen from '../DriverHomeScreen';
import MessagesStack from './MessagesStack';
import DriverProfileStack from './DriverProfileStack';
import DriverReizeStack from './DriverReizeStack'; // ✨ Імпорт стека рейсів
const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth(); // ✨ Отримуємо сесію

  const [unreadCount, setUnreadCount] = useState(0); // ✨ Стан для лічильника

  // ✨ Функція для завантаження кількості непрочитаних повідомлень
  const fetchUnreadCount = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase.rpc('get_total_unread_count');
      if (error) throw error;
      setUnreadCount(data);
    } catch (error) {
      console.error("Error fetching unread count:", error.message);
    }
  }, [session]);

  // ✨ Оновлюємо лічильник, коли екран стає активним
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // ✨ Підписуємось на зміни в таблиці повідомлень в реальному часі
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('public:messages:driver_tab_navigator')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            fetchUnreadCount();
          }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, fetchUnreadCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: ((route) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? '';
          if (routeName === 'IndividualChat') {
            return { display: 'none' };
          }
          return {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          };
        })(route),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'DriverHomeTab') {
            iconName = focused ? 'list-circle' : 'list-circle-outline';
          } else if (route.name === 'MessagesTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'DriverProfileTab') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="DriverHomeTab" 
        component={DriverHomeScreen} 
        options={{ title: t('tabs.driver.home', 'Трансфери') }}
      />
      <Tab.Screen
        name="DriverReizeStack" 
        component={DriverReizeStack}
        options={{ title: t('tabs.flights', 'Рейси') }}
      /> 
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack}
        options={{ 
          title: t('tabs.messages', 'Повідомлення'), 
          // ✨ Динамічно показуємо лічильник
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
        }}
      />      
      <Tab.Screen 
        name="DriverProfileTab" 
        component={DriverProfileStack}
        options={{ 
          title: t('tabs.profile', 'Профіль'),
        }}
      />
    </Tab.Navigator>
  );
}
