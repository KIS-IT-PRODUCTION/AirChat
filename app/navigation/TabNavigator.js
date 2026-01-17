import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import { useUnreadCount } from '../../provider/Unread Count Context';
import { useNewOffers } from '../../provider/NewOffersContext';

import HomeScreen from '../HomeScreen';
import TransfersScreen from '../TransfersScreen';
import ProfileStack from './ProfileStack'; 
import MessagesStack from './MessagesStack';
import Home from '../../assets/panel/home.svg';
import Home2 from '../../assets/panel/home2.svg';
import Chat from '../../assets/chat.svg';
import Chat2 from '../../assets/chat2.svg';
const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const { unreadCount } = useUnreadCount();
  const { newOffersCount } = useNewOffers();

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
            iconName = focused ? 'airplane' : 'airplane-outline';
          } else if (route.name === 'MessagesTab') {
            return focused ? <Chat2 width={size} height={size} fill={color} /> : <Chat width={size} height={size} fill={color} />;
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
        options={{ 
          title: t('tabs.transfers', 'Трансфери'),
          tabBarBadge: newOffersCount > 0 ? newOffersCount : null,
          tabBarBadgeStyle: { backgroundColor: '#FFA000' }
        }}
      />
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack}
        options={{ 
          title: t('tabs.messages', 'Чат'), 
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