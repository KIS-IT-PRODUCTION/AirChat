import 'react-native-gesture-handler';
import './i18n';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Modal, ActivityIndicator, Text, AppState, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';

// --- Screens ---
import HomeScreen from './app/HomeScreen';
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

// Тримаємо сплеш-скрін видимим, поки додаток не буде готовий
SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

// --- Вкладені навігатори ---
function AuthNavigator({ isFirstLaunch }) {
    return (
        <Stack.Navigator
            initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'}
            screenOptions={{ headerShown: false, animationEnabled: false }}
        >
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
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
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
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <Stack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="PublicDriverProfile" component={PublicDriverProfileScreen} />
            <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
        </Stack.Navigator>
    );
}

const linkingConfig = {
  prefixes: ['airchat://'],
  config: { 
    screens: { 
        UserAppFlow: {
            screens: {
                MainTabs: {
                    screens: {
                        MessagesTab: {
                            screens: {
                                IndividualChat: 'chat/:roomId',
                            }
                        }
                    }
                }
            }
        },
        AuthFlow: {
            screens: {
                ResetPasswordScreen: 'reset-password'
            }
        }
    } 
  },
};

// --- Головний навігатор-перемикач ---
function RootNavigator() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const navigationRef = useRef(null);
    
    // Всі інші хуки залишаються тут
    const { isInternetReachable } = useNetInfo();
    const heartbeatTimeout = useRef(null);
    usePushNotifications(navigationRef);
    const { unreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();

    useEffect(() => {
        const checkOnboarding = async () => {
            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
            setIsFirstLaunch(hasOnboarded === null);
        };
        checkOnboarding();
    }, []);

    // ✨ Оновлений useEffect, який тепер тільки ховає сплеш-скрін
    useEffect(() => {
        // Перевіряємо, що всі дані для визначення маршруту завантажені
        const isAppReady = !isAuthLoading && isFirstLaunch !== null;
        if (isAppReady) {
            // Як тільки все готово, ховаємо нативний сплеш-скрін
            SplashScreen.hideAsync();
        }
    }, [isAuthLoading, isFirstLaunch]);
    
    // Всі інші useEffect залишаються без змін
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' && navigationRef.current) {
                navigationRef.current.navigate('AuthFlow', { screen: 'ResetPasswordScreen' });
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
            await Notifications.setBadgeCountAsync(totalBadgeCount);
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    useEffect(() => {
        if (isAuthLoading || !session || !profile) {
            if (heartbeatTimeout.current) {
                clearInterval(heartbeatTimeout.current);
                heartbeatTimeout.current = null;
            }
            return;
        }
        const updateLastSeen = async () => { /* ... (код без змін) */ };
        const handleAppStateChange = (nextAppState) => { /* ... (код без змін) */ };
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        handleAppStateChange('active');
        return () => {
            appStateSubscription.remove();
            if (heartbeatTimeout.current) {
                clearInterval(heartbeatTimeout.current);
            }
        };
    }, [isAuthLoading, session, profile]);

    // ✨ КЛЮЧОВА ЗМІНА: поки йде завантаження, нічого не рендеримо.
    // Це дозволяє нативному сплеш-скріну залишатись видимим.
    if (isAuthLoading || isFirstLaunch === null) {
        return null;
    }

    // ✨ Визначаємо, який екран буде початковим, ДО рендеру навігатора
    const initialRouteName = session && profile
      ? (profile.role === 'driver' ? 'DriverAppFlow' : 'UserAppFlow')
      : 'AuthFlow';

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} linking={linkingConfig}>
                <Stack.Navigator 
                    // ✨ Тепер навігатор відразу знає, який екран показати першим
                    initialRouteName={initialRouteName}
                    screenOptions={{ 
                        headerShown: false, 
                        animationEnabled: false 
                    }}
                >
                    {/* Екран-заглушка `SplashPlaceholder` більше не потрібен */}
                    <Stack.Screen name="AuthFlow">
                        {() => <AuthNavigator isFirstLaunch={isFirstLaunch} />}
                    </Stack.Screen>
                    <Stack.Screen name="UserAppFlow" component={UserAppStack} />
                    <Stack.Screen name="DriverAppFlow" component={DriverAppStack} />
                </Stack.Navigator>
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
          <NewOffersProvider>
            <NewTripsProvider>
                <RootNavigator />
            </NewTripsProvider>
          </NewOffersProvider>
        </UnreadCountProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const NoInternetModal = ({ visible }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return (<Modal animationType="fade" transparent={true} visible={visible}><View style={styles.modalBackdrop}><View style={styles.modalContent}><Ionicons name="wifi-outline" size={80} color={colors.secondaryText} /><Text style={styles.modalTitle}>{t('errors.noInternetTitle')}</Text><Text style={styles.modalSubtitle}>{t('errors.noInternetSubtitle')}</Text></View></View></Modal>);
};
const getStyles = (colors) => StyleSheet.create({
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors?.background || '#121212', padding: 20 },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
    modalContent: {
        backgroundColor: colors?.card || '#1e1e1e',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '80%',
    },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors?.text || '#fff', marginTop: 20, textAlign: 'center' },
    modalSubtitle: { fontSize: 16, color: colors?.secondaryText || '#aaa', textAlign: 'center', marginTop: 8 },
});