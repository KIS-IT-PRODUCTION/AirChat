import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Імпорт вашого провайдера теми
import { ThemeProvider } from './app/ThemeContext'; 

// Імпорт вашого головного екрану
import HomeScreen from './app/HomeScreen'; // Переконайтесь, що шлях правильний

// Створюємо екземпляр Stack Navigator
const Stack = createStackNavigator();

export default function App() {
  return (
    // 1. Огортаємо все в ThemeProvider, щоб усі екрани мали доступ до теми
    <ThemeProvider>
      {/* 2. NavigationContainer - це кореневий компонент для навігації */}
      <NavigationContainer>
        {/* 3. Stack.Navigator керує переходами між екранами */}
        <Stack.Navigator>
          {/* 4. Реєструємо HomeScreen як один з екранів */}
          <Stack.Screen
            name="HomeScreen"
            component={HomeScreen}
            // Ховаємо стандартний заголовок, оскільки ваш HomeScreen має власний кастомний хедер
            options={{ headerShown: false }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}