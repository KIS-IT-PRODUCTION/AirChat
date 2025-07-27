import 'react-native-gesture-handler';
import './i18n'; // Переконайтесь, що шлях до i18n правильний

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

// Ваші існуючі імпорти
import { ThemeProvider } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';

// Імпортуємо всі екрани та навігатори
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import TabNavigator from './app/navigation/TabNavigator';
import Settings from './app/Settings';
import TransferDetailScreen from './app/TransferDetailScreen'; // ✨ ІМПОРТ НОВОГО ЕКРАНА

const Stack = createStackNavigator();
const RootStack = createStackNavigator(); // ✨ СТВОРЮЄМО КОРЕНЕВИЙ СТЕК

// --- Навігатор для потоку автентифікації (без змін) ---
function AuthStack({ isFirstLaunch }) {
  return (
    <Stack.Navigator 
      initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'}
      screenOptions={{ headerShown: false }}
    >
      {isFirstLaunch && (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      )}
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

// --- ✨ НОВИЙ КОРЕНЕВИЙ НАВІГАТОР ДЛЯ ЗАЛОГІНЕНОГО КОРИСТУВАЧА ---
// Він включає в себе TabNavigator і екрани, що мають бути поверх вкладок
function RootStackNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen name="TransferDetail" component={TransferDetailScreen} />
      {/* Тут можна додати інші екрани, які мають відкриватися поверх вкладок */}
    </RootStack.Navigator>
  );
}


// --- Компонент, що вирішує, який навігатор показати ---
function AppContent() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkIfFirstLaunch = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        setIsFirstLaunch(hasOnboarded === null);
      } catch (e) {
        console.error('Failed to check onboarding status', e);
        setIsFirstLaunch(true);
      } finally {
        setIsLoading(false);
      }
    };
    checkIfFirstLaunch();
  }, []);

  if (isAuthLoading || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && session.user ? (
        // ✨ Якщо користувач залогінений, показуємо КОРЕНЕВИЙ навігатор
        <RootStackNavigator />
      ) : (
        // Якщо ні - показуємо потік реєстрації/входу
        <AuthStack isFirstLaunch={isFirstLaunch} />
      )}
    </NavigationContainer>
  );
}


// --- Головний компонент App (без змін) ---
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}