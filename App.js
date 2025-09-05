// App.js

import 'react-native-gesture-handler';
import './i18n';

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text, StyleSheet, Modal, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider } from './provider/Unread Count Context';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';

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
import Support from './app/SupportScreen.js';


const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const DriverStack = createStackNavigator();

// --- Компоненти та навігатори ---
function GuestAppStack({ isFirstLaunch }) {
  return (
    <Stack.Navigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'} screenOptions={{ headerShown: false }}>
      {isFirstLaunch && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
    </Stack.Navigator>
  );
}
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
function DriverStackNavigator() {
    return (
      <NewTripsProvider>
        <DriverStack.Navigator screenOptions={{ headerShown: false }}>
            <DriverStack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <DriverStack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <DriverStack.Screen name="Support" component={Support} />
        </DriverStack.Navigator>
      </NewTripsProvider>
    );
}
const LoadingScreen = () => {
    const { colors } = useTheme();
    return (
        <View style={[getStyles(colors).centeredContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
};
const NoInternetModal = ({ visible }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (
        <Modal animationType="fade" transparent={true} visible={visible}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContent}>
                    <Ionicons name="wifi-outline" size={80} color={colors.secondaryText} />
                    <Text style={styles.modalTitle}>{t('errors.noInternetTitle', 'Немає з\'єднання')}</Text>
                    <Text style={styles.modalSubtitle}>{t('errors.noInternetSubtitle', 'Будь ласка, перевірте ваше інтернет-з\'єднання.')}</Text>
                </View>
            </View>
        </Modal>
    );
};


// --- Основний компонент логіки додатку ---
function AppContent() {
  const { session, profile, isLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const { isInternetReachable } = useNetInfo();
  const heartbeatTimeout = useRef(null);

  usePushNotifications();

  useEffect(() => {
    const checkOnboarding = async () => {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        setIsFirstLaunch(hasOnboarded === null);
    };
    checkOnboarding();
  }, []);

  // ✨ КЛЮЧОВЕ ВИПРАВЛЕННЯ: Логіка Heartbeat тепер залежить від isLoading
  useEffect(() => {
    // 🛑 Запускаємо Heartbeat тільки якщо:
    // 1. Завантаження завершено (isLoading === false)
    // 2. Користувач залогінений (є сесія та профіль)
    if (isLoading || !session || !profile) {
        // Якщо одна з умов не виконана, переконуємось, що таймер зупинено
        if (heartbeatTimeout.current) {
            clearInterval(heartbeatTimeout.current);
            heartbeatTimeout.current = null;
            console.log('[Heartbeat] Зупинено через відсутність сесії або завантаження.');
        }
        return; // Виходимо з ефекту
    }

    const updateLastSeen = async () => {
        // Додаткова перевірка, чи все ще є сесія
        if (supabase.auth.getSession()) {
            console.log('[Heartbeat] Оновлення статусу активності...');
            const { error } = await supabase.rpc('update_last_seen');
            if (error) console.error('[Heartbeat] Помилка RPC:', error.message);
        }
    };

    const handleAppStateChange = (nextAppState) => {
        if (heartbeatTimeout.current) clearInterval(heartbeatTimeout.current);

        if (nextAppState === 'active') {
            updateLastSeen(); // Оновлюємо одразу
            heartbeatTimeout.current = setInterval(updateLastSeen, 60000); // І запускаємо таймер
        } else {
            console.log('[Heartbeat] Додаток неактивний. Зупинка оновлень.');
        }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    handleAppStateChange('active');

    return () => {
        appStateSubscription.remove();
        if (heartbeatTimeout.current) {
            clearInterval(heartbeatTimeout.current);
        }
    };
  }, [isLoading, session, profile]); // ✨ Додано залежності isLoading та profile


  if (isLoading || isFirstLaunch === null) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
        <NavigationContainer>
            {session && profile ? (
              profile.role === 'driver' ? <DriverStackNavigator /> : <RootStackNavigator />
            ) : (
                <GuestAppStack isFirstLaunch={isFirstLaunch} />
            )}
        </NavigationContainer>
        <NoInternetModal visible={isInternetReachable === false} />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
        <AuthProvider>
            <UnreadCountProvider>
                <AppContent />
            </UnreadCountProvider>
        </AuthProvider>
    </ThemeProvider>
  );
}

// --- Стилі ---
const getStyles = (colors) => StyleSheet.create({
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors?.background || '#121212', padding: 20 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContent: {
        backgroundColor: colors?.card || '#1e1e1e',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '80%',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors?.text || '#fff', marginTop: 20, textAlign: 'center' },
    modalSubtitle: { fontSize: 16, color: colors?.secondaryText || '#aaa', textAlign: 'center', marginTop: 8 },
});