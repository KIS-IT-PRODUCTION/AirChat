// app/navigation/TabNavigator.js
import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../provider/AuthContext';

// Імпортуємо екрани та стеки
import HomeScreen from '../HomeScreen';
import TransfersScreen from '../TransfersScreen';
import ProfileStack from './ProfileStack'; 
import MessagesStack from './MessagesStack';
import Home from '../../assets/panel/home.svg';
import Home2 from '../../assets/panel/home2.svg';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth(); // Отримуємо сесію, яка тепер гарантовано надійна

  const [unreadCount, setUnreadCount] = useState(0); // Стан для лічильника

  // Функція для завантаження кількості непрочитаних повідомлень
  const fetchUnreadCount = useCallback(async () => {
    if (!session) return; // Запобігаємо виклику, якщо сесія не встановлена
    try {
      const { data, error } = await supabase.rpc('get_total_unread_count');
      if (error) throw error;
      setUnreadCount(data);
    } catch (error) {
      console.error("Error fetching unread count:", error.message);
    }
  }, [session]);

  // Оновлюємо лічильник, коли екран стає активним
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Підписуємось на зміни в таблиці повідомлень в реальному часі
  useEffect(() => {
    if (!session) return; // Запобігаємо підписці, якщо сесія не встановлена

    const channel = supabase
      .channel('public:messages:tab_navigator')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            // Коли будь-яке повідомлення змінюється, перезавантажуємо лічильник
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
          if (route.name === 'HomeTab') {
            return focused ? <Home2 width={size} height={size} fill={color} /> : <Home width={size} height={size} fill={color} />;
          } else if (route.name === 'TransfersTab') {
            iconName = 'airplane';
          } else if (route.name === 'MessagesTab') {
    iconName = focused ? 'chatbox' : 'chatbox-outline';
} if (route.name === 'ProfileTab') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ title: t('tabs.home', 'Головна') }}
      />
      <Tab.Screen 
        name="TransfersTab" 
        component={TransfersScreen} 
        options={{ title: t('tabs.transfers', 'Трансфери') }}
      />
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack}
        options={{ 
          title: t('tabs.messages', 'Чат'), 
          // Динамічно показуємо лічильник
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
        }}
      />      
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack}
        options={{ 
          title: t('tabs.profile', 'Профіль'),
        }}
      />
    </Tab.Navigator>
  );
}
