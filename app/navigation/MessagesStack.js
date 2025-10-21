import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';

import ChatListScreen from '../ChatListScreen'; 
import IndividualChatScreen from '../IndividualChatScreen'; 

const Stack = createStackNavigator();

// 💡 Налаштування інтерполятора для плавності на Android
const forSlide = ({ current, next, inverted, layouts: { screen } }) => {
  const progress = current.progress;
  
  return {
    cardStyle: {
      transform: [
        {
          translateX: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [screen.width, 0], // Зсув екрану з правого боку
            extrapolate: 'clamp',
          }),
        },
      ],
    },
    // Можна додати opacity для більш плавного вигляду, якщо потрібно
  };
};

export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        
        // 💡 ОПТИМІЗАЦІЯ 1: Використання нативного стеку екранів для кращої продуктивності
        // Цей параметр дозволяє нативно керувати життєвим циклом екранів.
        // Це вимагає, щоб ви встановили `react-native-screens` і обгорнули App.js.
        // Якщо ви використовуєте Expo, це працює з коробки.
        enableScreens: true, 

        // 💡 ОПТИМІЗАЦІЯ 2: Видалення неактивних екранів з ієрархії на Android.
        // Це допомагає зменшити використання пам'яті та пришвидшує переходи.
        detachInactiveScreens: Platform.OS === 'android' ? true : false,

        // 💡 ОПТИМІЗАЦІЯ 3: Налаштування анімації на Android (за замовчуванням може бути менш плавною)
        // Використання стандартного інтерполятора iOS на Android для плавнішого вигляду,
        // або кастомного forSlide, якщо потрібна повна схожість з iOS.
        cardStyleInterpolator: Platform.OS === 'android' ? forSlide : undefined,
        
        // Додаткове налаштування для Android (за замовчуванням):
        transitionSpec: {
            open: { animation: 'timing', config: { duration: 300 } },
            close: { animation: 'timing', config: { duration: 300 } },
        },
        
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      
      {/* 💡 Порада: На екрані чату переконайтеся, що ви використовуєте `InteractionManager.runAfterInteractions` 
          для будь-яких важких операцій, які блокують потік UI при першому відкритті, 
          навіть якщо у вас є індикатор завантаження. */}
      <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
    </Stack.Navigator>
  );
}