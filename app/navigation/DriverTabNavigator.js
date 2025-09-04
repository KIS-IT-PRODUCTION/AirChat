import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../provider/AuthContext';
import { useDebouncedCallback } from 'use-debounce'; // ✨ Імпорт для дебаунсингу

// Імпортуємо екрани та стеки для водія
import DriverHomeScreen from '../DriverHomeScreen';
import MessagesStack from './MessagesStack';
import DriverProfileStack from './DriverProfileStack';
import DriverReizeStack from './DriverReizeStack';
import MyTripsScreen from '../driver/MyTripsScreen'; 

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  // Функція для завантаження кількості непрочитаних повідомлень
  const fetchUnreadCount = useCallback(async () => {
    if (!session) return;
    try {
      console.log("[UNREAD_COUNT] Fetching total unread count...");
      const { data, error } = await supabase.rpc('get_total_unread_count');
      if (error) throw error;
      console.log(`[UNREAD_COUNT] Fetched count: ${data}`);
      setUnreadCount(data);
    } catch (error) {
      console.error("[UNREAD_COUNT] Error fetching unread count:", error.message);
    }
  }, [session]);

  // ✨ Створюємо дебаунс-версію нашої функції.
  // Вона буде викликатись не частіше, ніж раз на 500 мс,
  // що вирішує проблему стану гонитви.
  const debouncedFetchUnreadCount = useDebouncedCallback(fetchUnreadCount, 500);

  // Оновлюємо лічильник, коли екран (весь TabNavigator) стає активним.
  // Це важливо при поверненні з екрану чату.
  useFocusEffect(
    useCallback(() => {
      console.log("[FOCUS] Tab navigator is focused. Fetching unread count.");
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Підписуємось на зміни в таблиці повідомлень в реальному часі
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('public:messages:driver_tab_navigator')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            // ✨ Викликаємо дебаунс-версію замість звичайної
            console.log("[REALTIME] Message change detected. Triggering debounced fetch.", payload.eventType);
            debouncedFetchUnreadCount();
          }
      )
      .subscribe((status) => {
        console.log(`[REALTIME_SUB] Subscription status: ${status}`);
      });

    return () => {
      console.log("[CLEANUP] Removing messages channel subscription.");
      supabase.removeChannel(channel);
    };
  }, [session, debouncedFetchUnreadCount]);

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
          }else if (route.name === 'MyTripsTab') { 
            iconName = focused ? 'car-sport' : 'car-sport-outline';
          }
           else if (route.name === 'MessagesTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'DriverReizeStack') {
            iconName = focused ? 'airplane' : 'airplane-outline';
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
            name="MyTripsTab" 
            component={MyTripsScreen}
            options={{ 
              title: t('tabs.driver.myTrips', 'Мої поїздки'),
            }}
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
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: { backgroundColor: colors.primary }
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
