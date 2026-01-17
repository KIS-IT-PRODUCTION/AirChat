import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../../provider/AuthContext'; 

import ProfileScreen from '../ProfileScreen';
import SettingsScreen from '../Settings';
import DriverSettingsScreen from '../driver/DriverSettingsScreen';
import SupportScreen from '../SupportScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
  const { profile } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen 
        name="Settings" 
        component={profile?.is_driver ? DriverSettingsScreen : SettingsScreen} 
      />
      
      <Stack.Screen name="Support" component={SupportScreen} /> 
    </Stack.Navigator>
  );
}
