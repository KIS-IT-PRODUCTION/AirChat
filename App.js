import 'react-native-gesture-handler';
import './i18n'; // Переконайтесь, що шлях до i18n правильний

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

// Ваші існуючі імпорти (шляхи збережено)
import { ThemeProvider } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';

// Імпортуємо всі екрани та новий навігатор
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import TabNavigator from './app/navigation/TabNavigator'; // 👈 Додано імпорт TabNavigator
import  Settings  from './app/Settings'; // Import Settings if needed in the Profile tab

const Stack = createStackNavigator();

// --- Створюємо окремий навігатор для потоку автентифікації ---
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
      <Stack.Screen name="Settings" component={Settings} /> {/* Додано Settings */}

    </Stack.Navigator>
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
        // Якщо користувач залогінений, показуємо головний додаток з табами
        <TabNavigator />

      ) : (
        // Якщо ні - показуємо потік реєстрації/входу
        <AuthStack isFirstLaunch={isFirstLaunch} />
      )}
    </NavigationContainer>
  );
}


// --- Головний компонент App, що огортає все в провайдери ---
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}