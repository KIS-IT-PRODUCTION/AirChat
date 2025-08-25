import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FlightScheduleScreen from '../driver/FlightScheduleScreen'; // ✨ Імпорт екрану розкладу рейсів


const Stack = createStackNavigator();

export default function DriverReizeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name='FlightScheduleScreen' component={FlightScheduleScreen}/>
    </Stack.Navigator>
  );
}
