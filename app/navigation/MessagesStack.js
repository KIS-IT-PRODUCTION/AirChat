import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ChatListScreen from '../ChatListScreen';
import IndividualChatScreen from '../IndividualChatScreen';

const Stack = createStackNavigator();

export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
    </Stack.Navigator>
  );
}