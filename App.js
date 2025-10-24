import 'react-native-google-places-autocomplete';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n'; // Переконайтесь, що i18n ініціалізовано тут

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Text, AppState, Platform, Animated, TouchableOpacity, Easing, StatusBar } from 'react-native'; // 💡 Додано StatusBar, Easing
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { LogBox } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context'; // 💡 Додано SafeAreaProvider

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

// Імпортуємо react-native-screens (переконайтесь, що викликано enableScreens())
import { enableScreens } from 'react-native-screens';
enableScreens();

SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs([
  'Warning: Text strings must be rendered within a <Text> component.'
]);

const Stack = createStackNavigator();

// --- Навігатори ---
function AuthNavigator({ isFirstLaunch }) {
    return (
        <Stack.Navigator
            initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'}
            // 💡 Можливо, варто увімкнути стандартні анімації для плавності?
            // screenOptions={{ headerShown: false, animationEnabled: true }}
             screenOptions={{ headerShown: false, animationEnabled: false }} // Як було у вас
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
        <Stack.Navigator
            // screenOptions={{ headerShown: false, animationEnabled: true }}
            screenOptions={{ headerShown: false, animationEnabled: false }}
        >
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
        <Stack.Navigator
            // screenOptions={{ headerShown: false, animationEnabled: true }}
             screenOptions={{ headerShown: false, animationEnabled: false }}
        >
            <Stack.Screen name="DriverMainTabs" component={DriverTabNavigator} />
            <Stack.Screen name="DriverRequest" component={DriverRequestDetailScreen} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="PublicDriverProfile" component={PublicDriverProfileScreen} />
            <Stack.Screen name="IndividualChat" component={IndividualChatScreen} />
        </Stack.Navigator>
    );
}

// --- Deep Linking Config ---
const linkingConfig = {
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: {
    screens: {
        ResetPasswordScreen: 'reset-password',
        IndividualChat: 'chat/:roomId',
        // Додайте інші шляхи, якщо потрібно
    }
  },
};

// --- Кореневий Навігатор ---
function RootNavigator() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const navigationRef = useRef(null);

    // --- Логіка інтернет-з'єднання ---
    const netInfo = useNetInfo();
    const [isNetworkDown, setIsNetworkDown] = useState(false);
    const networkTimerRef = useRef(null);
    const DEBOUNCE_DELAY = 1500;

    usePushNotifications(navigationRef);
    const { unreadCount, fetchUnreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();

    useEffect(() => {
        const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;

        if (networkTimerRef.current) {
            clearTimeout(networkTimerRef.current);
        }

        if (netInfo.type !== 'unknown' && !isConnected) {
            // Мережа недоступна: встановлюємо таймер на показ
            networkTimerRef.current = setTimeout(() => {
                setIsNetworkDown(true);
            }, DEBOUNCE_DELAY);
        } else if (isConnected) {
            // Мережа доступна, приховуємо банер негайно
            setIsNetworkDown(false);
        }

        return () => {
            if (networkTimerRef.current) {
                clearTimeout(networkTimerRef.current);
            }
        };
    }, [netInfo.isConnected, netInfo.isInternetReachable, netInfo.type]);
    // --- Кінець логіки інтернет-з'єднання ---

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
                setIsFirstLaunch(hasOnboarded === null);
            } catch (e) {
                console.error("Failed to read onboarding status:", e);
                setIsFirstLaunch(true); // Показуємо онбордінг у разі помилки
            }
        };
        checkOnboarding();
    }, []);

    useEffect(() => {
        if (!isAuthLoading && isFirstLaunch !== null) {
            SplashScreen.hideAsync();
        }
    }, [isAuthLoading, isFirstLaunch]);

    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (session?.user) {
                if (nextAppState === 'active') {
                    supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();
                    fetchUnreadCount();
                } else {
                    // Коли додаток згортається, скидаємо активний чат
                    supabase.from('chat_room_presences').upsert({ user_id: session.user.id, active_room_id: null, updated_at: new Date().toISOString() }).then();
                }
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        // Викликаємо одразу при старті, щоб оновити статус
        handleAppStateChange(AppState.currentState);
        return () => {
            appStateSubscription.remove();
        };
    }, [session, fetchUnreadCount]);

    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                try {
                    const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
                    await Notifications.setBadgeCountAsync(totalBadgeCount >= 0 ? totalBadgeCount : 0); // Перевірка на від'ємне значення
                } catch (e) {
                    console.error("Failed to set badge count:", e);
                }
            }
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    useEffect(() => {
        const handleDeepLink = (event) => {
            const url = event.url;
            if (!url || !navigationRef.current?.isReady()) return;
            const { path } = Linking.parse(url);
            // Спрощена логіка, можливо потрібно додати більше перевірок
            if (path?.includes('reset-password') && !session) {
                navigationRef.current.navigate('ResetPasswordScreen');
            }
        };

        // Обробка початкового URL (якщо додаток відкрили через deep link)
        Linking.getInitialURL().then(url => {
            if (url) {
                const { path } = Linking.parse(url);
                 if (path?.includes('reset-password') && !session) {
                    // Затримка, щоб навігація встигла ініціалізуватись
                    setTimeout(() => navigationRef.current?.navigate('ResetPasswordScreen'), 500);
                 }
            }
        });

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => { subscription.remove(); };
    }, [session]); // Залежність тільки від сесії

    // Показуємо null (пустий екран), доки не визначимо isFirstLaunch та isAuthLoading
    if (isAuthLoading || isFirstLaunch === null) {
        return null;
    }

    return (
        <View style={{ flex: 1 }}>
            {/* Встановлюємо стиль статус-бару */}
            <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} translucent backgroundColor="transparent" />
            <NavigationContainer ref={navigationRef} linking={linkingConfig}>
                {session && profile ? (
                    profile.role === 'driver' ? <DriverAppStack /> : <UserAppStack />
                ) : (
                    <AuthNavigator isFirstLaunch={isFirstLaunch} />
                )}
            </NavigationContainer>
            {/* Банер тепер рендериться тут */}
            <NoInternetBanner visible={isNetworkDown} />
        </View>
    );
}

// -----------------------------------------------------------
// 💡 ОНОВЛЕНИЙ КОМПОНЕНТ: Спадаючий Банер NoInternetBanner
// -----------------------------------------------------------
const NoInternetBanner = memo(({ visible }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const animation = useRef(new Animated.Value(visible ? 1 : 0)).current;
    const insets = useSafeAreaInsets();

    const BANNER_CONTENT_HEIGHT = 50; // 💡 Зменшено висоту контенту
    const TOTAL_BANNER_HEIGHT = BANNER_CONTENT_HEIGHT + insets.top;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: visible ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [visible, animation]);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-TOTAL_BANNER_HEIGHT, 0],
    });

    const styles = getBannerStyles(colors, TOTAL_BANNER_HEIGHT, insets.top, BANNER_CONTENT_HEIGHT);

    // Зберігаємо стан видимості анімації, щоб уникнути зникнення під час анімації
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const prevVisible = useRef(visible);

    useEffect(() => {
        if (prevVisible.current && !visible) {
            setIsAnimatingOut(true);
            const listenerId = animation.addListener(({ value }) => {
                if (value === 0) {
                    setIsAnimatingOut(false);
                    animation.removeListener(listenerId);
                }
            });
        } else if (!prevVisible.current && visible) {
            setIsAnimatingOut(false); // Скидаємо, якщо він знову з'являється
        }
        prevVisible.current = visible;
    }, [visible, animation]);


    // Не рендеримо, якщо він невидимий І не анімується
     if (!visible && !isAnimatingOut) {
         return null;
     }

    return (
        <Animated.View style={[styles.bannerContainer, { transform: [{ translateY }] }]}>
            <View style={styles.content}>
                <Ionicons
                    name="cloud-offline-outline"
                    size={20}
                    color={styles.title.color}
                    style={styles.icon}
                />
                <Text style={styles.title} numberOfLines={1}>
                    {t('errors.noInternetTitle') || 'Немає з\'єднання з Інтернетом'}
                </Text>
            </View>
        </Animated.View>
    );
});

// 💡 ОНОВЛЕНІ СТИЛІ для банера
const getBannerStyles = (colors, totalHeight, topInset, contentHeight) => StyleSheet.create({
    bannerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: totalHeight,
        backgroundColor: colors?.danger || '#D32F2F', // Трохи темніший червоний
        paddingHorizontal: 15,
        justifyContent: 'flex-end', // Контент внизу
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 1000,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        height: contentHeight, // Фіксована висота контенту
        marginBottom: 8, // 💡 Зменшено відступ знизу
    },
    icon: {
        marginRight: 10, // Трохи більший відступ
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        flexShrink: 1, // Дозволяємо тексту скорочуватись
    },
});

// --- Головний компонент Додатку ---
export default function App() {
  return (
    // SafeAreaProvider має бути найвищим рівнем
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UnreadCountProvider>
            <NewOffersProvider>
              <NewTripsProvider>
                  <FormProvider>
                      <RootNavigator />
                  </FormProvider>
              </NewTripsProvider>
            </NewOffersProvider>
          </UnreadCountProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}