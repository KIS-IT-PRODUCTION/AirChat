import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ChatListScreen from '../ChatListScreen'; // Створимо на наступному кроці
import IndividualChatScreen from '../IndividualChatScreen'; // І цей теж

const Stack = createStackNavigator();

export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Ми будемо використовувати власні хедери на кожному екрані
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
    </Stack.Navigator>
  );
}