import 'react-native-google-places-autocomplete';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n';

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Text, AppState, Platform, Animated, Easing, StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { LogBox } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import HomeScreen, { FormProvider } from './app/HomeScreen';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';

// Імпорти екранів
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';
import RegistrationScreen from './app/RegistrationScreen';
import LoginScreen from './app/LoginScreen';
import ForgotPasswordScreen from './app/components/ForgotPasswordScreen.js';
import ResetPasswordScreen from './app/components/ResetPasswordScreen.js';
import TabNavigator from './app/navigation/TabNavigator';
import DriverTabNavigator from './app/navigation/DriverTabNavigator';
import Settings from './app/Settings';
import TransferDetailScreen from './app/TransferDetailScreen';
import DriverRequestDetailScreen from './app/driver/DriverRequestDetailScreen';
import PublicDriverProfileScreen from './app/driver/PublicDriverProfileScreen.js';
import Support from './app/SupportScreen.js';
import IndividualChatScreen from './app/IndividualChatScreen.js';

enableScreens();
SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Warning: Text strings must be rendered within a <Text> component.']);

const Stack = createStackNavigator();

// --- Навігатори (без змін) ---
function AuthNavigator({ isFirstLaunch }) {
    return (
        <Stack.Navigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'} screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
        </Stack.Navigator>
    );
}
function UserAppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="TransferDetail" component={TransferDetailScreen} />
            <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="PublicDriverProfile" component={PublicDriverProfileScreen} />
            <Stack.Screen name="Support" component={Support} />
        </Stack.Navigator>
    );
}
function DriverAppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <Stack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="PublicDriverProfile" component={PublicDriverProfileScreen} />
            <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
        </Stack.Navigator>
    );
}

// --- Deep Linking Config (без змін) ---
const linkingConfig = {
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: { screens: { ResetPasswordScreen: 'reset-password', IndividualChat: 'chat/:roomId' } },
};

// ✅ ВИПРАВЛЕНО: Створено новий компонент, який буде всередині NavigationContainer
// Вся логіка з RootNavigator тепер тут.
function AppContent() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const { colors } = useTheme(); // Додано для статус-бару

    // Хуки для сповіщень та лічильників
    usePushNotifications(); // Тепер він може безпечно використовувати useNavigation всередині
    const { unreadCount, fetchUnreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();

    // Логіка інтернет-з'єднання
    const netInfo = useNetInfo();
    const [isNetworkDown, setIsNetworkDown] = useState(false);
    useEffect(() => {
        const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
        if (netInfo.type !== 'unknown') { setIsNetworkDown(!isConnected); }
    }, [netInfo.isConnected, netInfo.isInternetReachable, netInfo.type]);

    // Логіка онбордінгу
    useEffect(() => {
        const checkOnboarding = async () => {
            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
            setIsFirstLaunch(hasOnboarded === null);
        };
        checkOnboarding();
    }, []);

    // Приховування сплеш-скріна
    useEffect(() => {
        if (!isAuthLoading && isFirstLaunch !== null) {
            SplashScreen.hideAsync();
        }
    }, [isAuthLoading, isFirstLaunch]);

    // Логіка AppState та оновлення статусу "онлайн"
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (session?.user && nextAppState === 'active') {
                supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();
                fetchUnreadCount();
            }
        };
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        return () => { appStateSubscription.remove(); };
    }, [session, fetchUnreadCount]);

    // Оновлення бейджа на іконці додатку
    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
                await Notifications.setBadgeCountAsync(Math.max(0, totalBadgeCount));
            }
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    // Поки дані завантажуються, показуємо null (пустий екран, поки сплеш-скрін активний)
    if (isAuthLoading || isFirstLaunch === null) {
        return null;
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Встановлюємо стиль статус-бару */}
            <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
            {session && profile ? (
                profile.role === 'driver' ? <DriverAppStack /> : <UserAppStack />
            ) : (
                <AuthNavigator isFirstLaunch={isFirstLaunch} />
            )}
            <NoInternetBanner visible={isNetworkDown} />
        </View>
    );
}

// --- Компонент банера (без змін) ---
const NoInternetBanner = memo(({ visible }) => { /* ... */ });
const getBannerStyles = (colors, totalHeight, topInset, contentHeight) => StyleSheet.create({ /* ... */ });

// --- Головний компонент Додатку ---
export default function App() {
  return (
    // ✅ ВИПРАВЛЕНО: Головний компонент тепер лише надає контекст та навігацію
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UnreadCountProvider>
            <NewOffersProvider>
              <NewTripsProvider>
                  <FormProvider>
                      <NavigationContainer linking={linkingConfig}>
                          <AppContent />
                      </NavigationContainer>
                  </FormProvider>
              </NewTripsProvider>
            </NewOffersProvider>
          </UnreadCountProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}