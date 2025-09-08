import 'react-native-gesture-handler';
import './i18n';

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Modal, AppState, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen'; // ✨ 1. Імпортуємо SplashScreen

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';

// --- Screens & Navigators ---
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

// ✨ 2. Забороняємо сплеш-скріну автоматично ховатися
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();
const RootStack = createStackNavigator();
const DriverStack = createStackNavigator();

// --- Components ---
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
      <RootStack.Screen name="Support" component={Support} />
      
    </RootStack.Navigator>
  );
}

function DriverStackNavigator() {
    return (
        <DriverStack.Navigator screenOptions={{ headerShown: false }}>
            <DriverStack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <DriverStack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <DriverStack.Screen name="Support" component={Support} />
        </DriverStack.Navigator>
    );
}

const NoInternetModal = ({ visible }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (
        <Modal animationType="fade" transparent={true} visible={visible}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContent}>
                    <Ionicons name="wifi-outline" size={80} color={colors.secondaryText} />
                    <Text style={styles.modalTitle}>{t('errors.noInternetTitle', 'No Connection')}</Text>
                    <Text style={styles.modalSubtitle}>{t('errors.noInternetSubtitle', 'Please check your internet connection.')}</Text>
                </View>
            </View>
        </Modal>
    );
};

const linkingConfig = {
  prefixes: ['airchat://'],
  config: {
    screens: {
      PublicDriverProfile: 'driver/:driverId',
    },
  },
};

// --- Main App Logic Component ---
function AppContent() {
  const { session, profile, isLoading: isAuthLoading } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const { isInternetReachable } = useNetInfo();
  const heartbeatTimeout = useRef(null);
  
  // ✨ 3. Створюємо єдиний стан готовності додатку
  const appIsReady = !isAuthLoading && isFirstLaunch !== null;

  usePushNotifications();

  const { unreadCount } = useUnreadCount();
  const { newOffersCount } = useNewOffers();
  const { newTripsCount } = useNewTrips();

  useEffect(() => {
    async function prepareApp() {
        try {
            // Тут можна додати завантаження шрифтів, якщо потрібно
            // await Font.loadAsync({...});

            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
            setIsFirstLaunch(hasOnboarded === null);
        } catch (e) {
            console.warn(e);
            // У випадку помилки, все одно продовжуємо роботу
            setIsFirstLaunch(false);
        }
    }
    prepareApp();
  }, []);
  
  // ✨ 4. Створюємо useEffect, який сховає сплеш-скрін, коли додаток готовий
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  useEffect(() => {
    const updateTotalBadgeCount = async () => {
      const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
      console.log(`[TOTAL_BADGE] Updating app icon badge to: ${totalBadgeCount}`);
      await Notifications.setBadgeCountAsync(totalBadgeCount);
    };
    updateTotalBadgeCount();
  }, [unreadCount, newOffersCount, newTripsCount]);

  useEffect(() => {
    const requestNotificationPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log('Permission to receive notifications was denied.');
        }
      }
    };
    requestNotificationPermissions();
  }, []);
  
  useEffect(() => {
    if (isAuthLoading || !session || !profile) {
        if (heartbeatTimeout.current) {
            clearInterval(heartbeatTimeout.current);
            heartbeatTimeout.current = null;
        }
        return;
    }

    const updateLastSeen = async () => {
        if (supabase.auth.getSession()) {
            const { error } = await supabase.rpc('update_last_seen');
            if (error) console.error('[Heartbeat] RPC Error:', error.message);
        }
    };

    const handleAppStateChange = (nextAppState) => {
        if (heartbeatTimeout.current) clearInterval(heartbeatTimeout.current);
        if (nextAppState === 'active') {
            updateLastSeen();
            heartbeatTimeout.current = setInterval(updateLastSeen, 60000);
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
  }, [isAuthLoading, session, profile]);

  // ✨ 5. Поки додаток не готовий, нічого не рендеримо. Це тримає сплеш-скрін видимим.
  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
        <NavigationContainer linking={linkingConfig}>
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

// --- Root App Component ---
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UnreadCountProvider>
          <NewOffersProvider>
            <NewTripsProvider>
              <AppContent />
            </NewTripsProvider>
          </NewOffersProvider>
        </UnreadCountProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// --- Styles ---
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
