// app/navigation/DriverTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Імпортуємо екрани та стеки для водія
import DriverHomeScreen from '../DriverHomeScreen';
import MessagesStack from './MessagesStack'; // Можна перевикористовувати
import DriverProfileStack from './DriverProfileStack';

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: ((route) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? '';
          // Приховуємо панель на екрані індивідуального чату
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
        options={{ title: t('tabs.driver.home', 'Заявки') }}
      />
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack}
        options={{ 
          title: t('tabs.messages', 'Повідомлення'), 
          tabBarBadge: 3, // Приклад
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
