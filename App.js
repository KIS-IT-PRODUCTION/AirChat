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
import { supabase } from './config/supabase';
import { usePushNotifications } from './usePushNotifications.js';
// --- Екрани та навігатори ---
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import TabNavigator from './app/navigation/TabNavigator'; // Панель пасажира
import DriverTabNavigator from './app/navigation/DriverTabNavigator'; // ✨ ПАНЕЛЬ ВОДІЯ
import Settings from './app/Settings';
import TransferDetailScreen from './app/TransferDetailScreen';
import DriverRequestDetailScreen from './app/driver/DriverRequestDetailScreen';
import PublicDriverProfileScreen from './app/driver/PublicDriverProfileScreen.js'; // Профіль водія
import FlightScheduleScreen from './app/driver/FlightScheduleScreen';

const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const DriverStack = createStackNavigator();

// --- Навігатор для НЕ залогінених користувачів (Гостьовий режим) ---
function GuestAppStack({ isFirstLaunch }) {
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
    </Stack.Navigator>
  );
}

// --- Навігатор для КЛІЄНТА (залогінений стан) ---
function RootStackNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen name="TransferDetail" component={TransferDetailScreen} />
      <RootStack.Screen name="Settings" component={Settings} />
      <RootStack.Screen name="PublicDriverProfile" component={PublicDriverProfileScreen} />
    </RootStack.Navigator>
  );
}

// --- ✨ ОНОВЛЕНИЙ НАВІГАТОР ДЛЯ ВОДІЯ ---
// Тепер він використовує навігаційну панель
function DriverStackNavigator() {
    return (
        <DriverStack.Navigator screenOptions={{ headerShown: false }}>
            <DriverStack.Screen 
                name="DriverMainTabs" 
                component={DriverTabNavigator} 
            />
            <DriverStack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
    
        </DriverStack.Navigator>
    );
}


// --- Компонент, що вирішує, який навігатор показати ---
function AppContent() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
 usePushNotifications(); 
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
        userProfile.role === 'driver'
          ? <DriverStackNavigator />
          : <RootStackNavigator />
      ) : (
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
