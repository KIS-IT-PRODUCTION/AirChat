import 'react-native-gesture-handler';
import './i18n';

import React, { useState, useEffect, useRef } from 'react';
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

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

// --- Вкладені навігатори ---

// ✨ 1. Навігатор для неавторизованого користувача (гостя)
function AuthNavigator({ isFirstLaunch }) {
    return (
        <Stack.Navigator
            initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'}
            screenOptions={{ headerShown: false }}
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

// ✨ 2. Стек для звичайного користувача (пасажира)
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

// ✨ 3. Стек для водія
function DriverAppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <Stack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <Stack.Screen name="Support" component={Support} />
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

const SplashPlaceholder = () => {
    const { colors } = useTheme();
    return <View style={[getStyles(colors).centeredContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
};

// --- Головний навігатор-перемикач ---
function RootNavigator() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const navigationRef = useRef(null);
    const [isNavigationReady, setNavigationReady] = useState(false);
    
    // Всі інші хуки (heartbeat, push, unread counts) залишаються тут, як і раніше
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

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' && navigationRef.current) {
                // Навігуємо всередині потоку для гостя
                navigationRef.current.navigate('AuthFlow', { screen: 'ResetPasswordScreen' });
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const isAppReady = !isAuthLoading && isFirstLaunch !== null && isNavigationReady;
        if (isAppReady && navigationRef.current) {
            let targetRoute;
            if (session && profile) {
                targetRoute = profile.role === 'driver' ? 'DriverAppFlow' : 'UserAppFlow';
            } else {
                targetRoute = 'AuthFlow';
            }
            
            navigationRef.current.reset({ index: 0, routes: [{ name: targetRoute }] });
            SplashScreen.hideAsync();
        }
    }, [isAuthLoading, isFirstLaunch, isNavigationReady, session, profile]);
    
    // Всі інші useEffect для сповіщень та heartbeat залишаються без змін
    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
            await Notifications.setBadgeCountAsync(totalBadgeCount);
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    useEffect(() => {
        const requestNotificationPermissions = async () => {
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync();
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

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} linking={linkingConfig} onReady={() => setNavigationReady(true)}>
                {/* ✨ 4. Головний навігатор тепер перемикає цілі групи екранів */}
                <Stack.Navigator 
                    screenOptions={{ 
                        headerShown: false, 
                        // Вимикаємо анімацію для плавного переходу між станами (гість/користувач)
                        animationEnabled: false 
                    }}
                >
                    <Stack.Screen name="SplashPlaceholder" component={SplashPlaceholder} />
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

