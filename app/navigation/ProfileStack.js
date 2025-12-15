import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// ✨ 1. Імпортуємо хук useAuth для доступу до даних профілю
import { useAuth } from '../../provider/AuthContext'; 

// ✨ 2. Імпортуємо обидва екрани налаштувань
import ProfileScreen from '../ProfileScreen';
import SettingsScreen from '../Settings'; // Налаштування для пасажира
import DriverSettingsScreen from '../driver/DriverSettingsScreen'; // Налаштування для водія
import SupportScreen from '../SupportScreen';

const Stack = createStackNavigator();

export default function ProfileStack() {
  // ✨ 3. Отримуємо дані профілю користувача
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
