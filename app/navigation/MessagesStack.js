import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';import { Platform } from 'react-native';

import ChatListScreen from '../ChatListScreen'; 
import IndividualChatScreen from '../IndividualChatScreen'; 

const Stack = createStackNavigator();

export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        
        // ОПТИМІЗАЦІЯ: Налаштовуємо анімацію зсуву.
        animation: 'slide_from_right', 

        // 💡 ВИПРАВЛЕННЯ: presentation:'card' гарантує, що на iOS не буде модального переходу,
        // а буде перехід зсувом, що є кращим для чату.
        presentation: 'card', 
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen 
        name="IndividualChat" 
        component={IndividualChatScreen} 
        options={{
          // 💡 ВИПРАВЛЕННЯ: Це запобігає появі білого фону/мерехтіння, 
          // оскільки фон буде прозорим, і відобразиться ваш фон з IndividualChatScreen.
          contentStyle: { backgroundColor: 'transparent' }, 
        }}
      />
    </Stack.Navigator>
  );
}