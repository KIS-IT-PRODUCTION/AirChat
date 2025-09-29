import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n';

import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Modal, Text, AppState, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
// --- ЗМІНА: Імпортуємо FormProvider з HomeScreen ---
import HomeScreen, { FormProvider } from './app/HomeScreen';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';
 
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

// --- ЗМІНА: Спрощена та виправлена конфігурація для "глибинних посилань" ---
const linkingConfig = {
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: { 
    screens: { 
        // Екрани, доступні коли користувач не залогінений
        ResetPasswordScreen: 'reset-password',
        // Екрани, доступні коли користувач залогінений
        IndividualChat: 'chat/:roomId',
    } 
  },
};

// --- Головний навігатор-перемикач ---
function RootNavigator() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const navigationRef = useRef(null);
    
    const { isInternetReachable } = useNetInfo();
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
        const isAppReady = !isAuthLoading && isFirstLaunch !== null;
        if (isAppReady) {
            SplashScreen.hideAsync();
        }
    }, [isAuthLoading, isFirstLaunch]);
    
    // --- ЗМІНА: Покращена обробка deep links, коли додаток вже відкритий ---
    useEffect(() => {
        const handleDeepLink = (event) => {
            const url = event.url;
            if (!url || !navigationRef.current?.isReady()) return;

            const { path } = Linking.parse(url);
            
            // Якщо прийшло посилання на скидання пароля, а користувач не залогінений,
            // перенаправляємо його на потрібний екран.
            if (path.includes('reset-password') && !session) {
                console.log("Password reset link opened. Navigating...");
                navigationRef.current.navigate('ResetPasswordScreen');
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => {
            subscription.remove();
        };
    }, [session]); // Залежність від сесії, щоб знати поточний стан авторизації

    // Оновлення лічильника на іконці додатку
    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
                await Notifications.setBadgeCountAsync(totalBadgeCount);
            }
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    // Оновлення статусу "last_seen"
    useEffect(() => {
        let heartbeatTimeout = null;
        if (isAuthLoading || !session || !profile) {
            if (heartbeatTimeout) {
                clearInterval(heartbeatTimeout);
            }
            return;
        }

        const updateLastSeen = async () => {
            await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
        };

        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                updateLastSeen();
                if (heartbeatTimeout) clearInterval(heartbeatTimeout);
                heartbeatTimeout = setInterval(updateLastSeen, 60000); // Оновлюємо кожну хвилину
            } else {
                if (heartbeatTimeout) clearInterval(heartbeatTimeout);
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        handleAppStateChange('active');

        return () => {
            appStateSubscription.remove();
            if (heartbeatTimeout) {
                clearInterval(heartbeatTimeout);
            }
        };
    }, [isAuthLoading, session, profile]);

    // Показуємо нативний сплеш-скрін, поки йде завантаження
    if (isAuthLoading || isFirstLaunch === null) {
        return null; 
    }

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} linking={linkingConfig}>
                {session && profile ? (
                    // Користувач увійшов: показуємо відповідний інтерфейс
                    profile.role === 'driver' ? <DriverAppStack /> : <UserAppStack />
                ) : (
                    // Користувач не увійшов: показуємо потік автентифікації
                    <AuthNavigator isFirstLaunch={isFirstLaunch} />
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
          <NewOffersProvider>
            <NewTripsProvider>
                {/* --- ЗМІНА: Додано FormProvider для збереження даних форм --- */}
                <FormProvider>
                    <RootNavigator />
                </FormProvider>
            </NewTripsProvider>
          </NewOffersProvider>
        </UnreadCountProvider>
      </AuthProvider>
    </ThemeProvider>
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
                    <Text style={styles.modalTitle}>{t('errors.noInternetTitle')}</Text>
                    <Text style={styles.modalSubtitle}>{t('errors.noInternetSubtitle')}</Text>
                </View>
            </View>
        </Modal>
    );
};

const getStyles = (colors) => StyleSheet.create({
    modalBackdrop: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0, 0, 0, 0.7)' 
    },
    modalContent: {
        backgroundColor: colors?.card || '#1e1e1e',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '80%',
    },
    modalTitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: colors?.text || '#fff', 
        marginTop: 20, 
        textAlign: 'center' 
    },
    modalSubtitle: { 
        fontSize: 16, 
        color: colors?.secondaryText || '#aaa', 
        textAlign: 'center', 
        marginTop: 8 
    },
});