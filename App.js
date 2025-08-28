import 'react-native-gesture-handler';
import './i18n'; // Переконайтесь, що шлях до i18n правильний

import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

// --- Імпорти ---
import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { supabase } from './config/supabase';
import { usePushNotifications } from './usePushNotifications.js';
// --- Екрани та навігатори ---
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import TabNavigator from './app/navigation/TabNavigator';
import DriverTabNavigator from './app/navigation/DriverTabNavigator';
import Settings from './app/Settings';
import TransferDetailScreen from './app/TransferDetailScreen';
import DriverRequestDetailScreen from './app/driver/DriverRequestDetailScreen';
import PublicDriverProfileScreen from './app/driver/PublicDriverProfileScreen.js';

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

// --- Навігатор для ВОДІЯ ---
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

// --- Компонент: Екран помилки ---
const ErrorScreen = ({ onRetry }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    return (
        <View style={styles.centeredContainer}>
            <Ionicons name="cloud-offline-outline" size={80} color={colors.secondaryText} />
            <Text style={styles.errorTitle}>{t('errors.networkTitle', 'Помилка мережі')}</Text>
            <Text style={styles.errorSubtitle}>{t('errors.networkSubtitle', 'Не вдалося підключитися до сервера. Перевірте ваше інтернет-з\'єднання.')}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Ionicons name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>{t('errors.retryButton', 'Перезавантажити')}</Text>
            </TouchableOpacity>
        </View>
    );
};

// --- Основний компонент логіки додатку ---
function AppContent() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  usePushNotifications(); 

  const loadInitialData = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    
    try {
        const netInfoState = await NetInfo.fetch();
        if (!netInfoState.isConnected) {
            throw new Error("No internet connection");
        }

        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        setIsFirstLaunch(hasOnboarded === null);

        if (session?.user) {
            const { data, error: profileError, status } = await supabase
                .from('profiles')
                .select(`role`)
                .eq('id', session.user.id)
                .single();

            if (profileError && status !== 406) throw profileError;
            setUserProfile(data);
        } else {
            setUserProfile(null);
        }
    } catch (e) {
        console.error('Failed to load initial data:', e.message);
        setError(e.message);
    } finally {
        setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (isLoading || isAuthLoading || isFirstLaunch === null) {
    return (
      <View style={[getStyles().centeredContainer, { backgroundColor: '#121212' }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (error) {
    return <ErrorScreen onRetry={loadInitialData} />;
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

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

// --- Стилі ---
const getStyles = (colors) => StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors?.background || '#fff',
        padding: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors?.text || '#000',
        marginTop: 20,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: colors?.secondaryText || '#666',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    retryButton: {
        flexDirection: 'row',
        backgroundColor: colors?.primary || '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignItems: 'center',
        gap: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
