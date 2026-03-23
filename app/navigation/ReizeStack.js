import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
// Імпортуємо той самий екран, що й у водія
import FlightScheduleScreen from '../driver/FlightScheduleScreen';

const Stack = createStackNavigator();

export default function ReizeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='FlightScheduleScreen' component={FlightScheduleScreen}/>
    </Stack.Navigator>
  );
}