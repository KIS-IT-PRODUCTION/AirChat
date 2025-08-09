import 'react-native-gesture-handler';
import './i18n'; // Переконайтесь, що шлях до i18n правильний

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';

// --- Імпорти ---
import { ThemeProvider } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { supabase } from './config/supabase'; // Перевірте шлях до вашого файлу конфігурації

// --- Екрани та навігатори ---
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import TabNavigator from './app/navigation/TabNavigator';
import Settings from './app/Settings';
import TransferDetailScreen from './app/TransferDetailScreen';

const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const DriverStack = createStackNavigator();

// --- Навігатор для НЕ залогінених користувачів (Гостьовий режим) ---
// Зберігаємо суть початкового файлу: HomeScreen доступний для всіх.
function GuestAppStack({ isFirstLaunch }) {
  return (
    <Stack.Navigator
      // Якщо перший запуск -> Onboarding. В іншому випадку -> HomeScreen.
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
      {/* Settings та інші захищені екрани тут відсутні, оскільки вони для залогінених користувачів */}
    </Stack.Navigator>
  );
}

// --- Навігатор для КЛІЄНТА (залогінений стан) ---
// Зберігаємо назву RootStackNavigator, як у вашій версії.
function RootStackNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen name="TransferDetail" component={TransferDetailScreen} />
      <RootStack.Screen name="Settings" component={Settings} />
    </RootStack.Navigator>
  );
}

// --- Навігатор для ВОДІЯ (залогінений стан) ---
const DriverDashboardScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24 }}>Панель водія</Text>
  </View>
);

function DriverStackNavigator() {
    return (
        <DriverStack.Navigator>
            <DriverStack.Screen
                name="DriverDashboard"
                component={DriverDashboardScreen}
                options={{ title: 'Мої поїздки' }}
            />
            {/* Тут можна додати інші екрани для водія, наприклад, налаштування */}
        </DriverStack.Navigator>
    );
}


// --- Компонент, що вирішує, який навігатор показати ---
function AppContent() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkIfFirstLaunch = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        setIsFirstLaunch(hasOnboarded === null);
      } catch (e) {
        console.error('Failed to check onboarding status', e);
        setIsFirstLaunch(true);
      }
    };
    checkIfFirstLaunch();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        setIsLoading(true);
        try {
          const { data, error, status } = await supabase
            .from('profiles')
            .select(`role`)
            .eq('id', session.user.id)
            .single();

          if (error && status !== 406) throw error;
          if (data) setUserProfile(data);

        } catch (error) {
          console.error('Error fetching user profile:', error.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else {
      setUserProfile(null);
      if (!isAuthLoading) setIsLoading(false);
    }
  }, [session, isAuthLoading]);

  if (isLoading || isAuthLoading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session && userProfile ? (
        // Якщо користувач залогінений і профіль завантажено
        userProfile.role === 'driver'
          ? <DriverStackNavigator />   // Показуємо навігатор водія
          : <RootStackNavigator />     // Показуємо навігатор клієнта
      ) : (
        // Якщо користувач не залогінений (гість)
        <GuestAppStack isFirstLaunch={isFirstLaunch} />
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
