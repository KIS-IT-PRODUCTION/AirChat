import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProfileScreen from '../ProfileScreen';
import SettingsScreen from '../Settings';
import SupportScreen from '../SupportScreen';
const Stack = createStackNavigator();

export default function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Support" component={SupportScreen} /> 
    </Stack.Navigator>
  );
}