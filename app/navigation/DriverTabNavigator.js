import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import Poizdki from '../../assets/poizdki.svg';
import Poizdki2 from '../../assets/poizdki_out.svg';
import Chat from '../../assets/chat.svg';
import Chat2 from '../../assets/chat2.svg';
import { useUnreadCount } from '../../provider/Unread Count Context';
import { useNewTrips } from '../../provider/NewTripsContext';
import DriverHomeScreen from '../DriverHomeScreen';
import MessagesStack from './MessagesStack';
import DriverProfileStack from './DriverProfileStack';
import DriverReizeStack from './DriverReizeStack';
import MyTripsScreen from '../driver/MyTripsScreen'; 

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const { unreadCount } = useUnreadCount();
  const { newTripsCount } = useNewTrips();

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
          } else if (route.name === 'MyTripsTab') {
            return focused ? <Poizdki2 width={size} height={size} fill={color} /> : <Poizdki width={size} height={size} fill={color} />;
          } else if (route.name === 'MessagesTab') {
            return focused ? <Chat2 width={size} height={size} fill={color} /> : <Chat width={size} height={size} fill={color} />;
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
        options={{ title: t('tabs.driver.home') }}
      />
      <Tab.Screen
        name="MyTripsTab"
        component={MyTripsScreen}
        options={{
          tabBarLabel: t('tabs.driver.myTrips'),
          tabBarBadge: newTripsCount > 0 ? newTripsCount : null,
          tabBarBadgeStyle: { backgroundColor: colors.primary }
        }}
      />
      <Tab.Screen
        name="DriverReizeStack" 
        component={DriverReizeStack}
        options={{ title: t('tabs.flights') }}
      /> 
      <Tab.Screen 
        name="MessagesTab" 
        component={MessagesStack}
        options={{ 
          title: t('tabs.messages'), 
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: { backgroundColor: colors.primary }
        }}
      />      
      <Tab.Screen 
        name="DriverProfileTab" 
        component={DriverProfileStack}
        options={{ 
          title: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}