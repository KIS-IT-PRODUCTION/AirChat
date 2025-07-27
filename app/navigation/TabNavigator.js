import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Імпортуємо екрани та стеки
import HomeScreen from '../HomeScreen';
import TransfersScreen from '../TransfersScreen';
import ProfileStack from '../navigation/ProfileStack'; 
import MessagesStack from './MessagesStack';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        // ✨ Логіка для стандартних іконок Ionicons
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'TransfersTab') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'MessagesTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'ProfileTab') {
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
          title: t('tabs.messages', 'Повідомлення'), 
          tabBarBadge: 3,
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