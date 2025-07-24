import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Import your
import HomeScreen from '../HomeScreen';
import TransfersScreen from '../TransfersScreen';
import MessagesScreen from '../MessagesScreen';
import ProfileScreen from '../ProfileScreen'; // You can add Profile here or keep it in a stack

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
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'TransfersTab') {
            iconName = focused ? 'airplane' : 'airplane-outline';
          } else if (route.name === 'MessagesTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('tabs.home') }}/>
      <Tab.Screen name="TransfersTab" component={TransfersScreen} options={{ title: t('tabs.transfers') }}/>
      <Tab.Screen name="MessagesTab" component={MessagesScreen} options={{ title: t('tabs.messages'), tabBarBadge: 3 }}/>
      {/* For simplicity, we add Profile as a tab. It can also be a screen in a Stack. */}
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ 
          title: t('tabs.profile'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}