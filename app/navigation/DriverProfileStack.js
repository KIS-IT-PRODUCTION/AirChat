import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DriverProfileScreen from '../DriverProfileScreen';
import DriverSettingsScreen from '../driver/DriverSettingsScreen';

const Stack = createStackNavigator();

export default function DriverProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
      <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} />
    </Stack.Navigator>
  );
}
