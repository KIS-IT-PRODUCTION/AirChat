import 'react-native-google-places-autocomplete'
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n';

// 💡 ВИПРАВЛЕНО: Додано memo та useCallback до імпорту з React
import React, { useState, useEffect, useRef, memo, useCallback } from 'react'; 
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Text, AppState, Platform, Animated, TouchableOpacity, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { LogBox } from 'react-native';
// 💡 ВИПРАВЛЕНО: Додано useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import HomeScreen, { FormProvider } from './app/HomeScreen';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
LogBox.ignoreLogs([
  'Warning: Text strings must be rendered within a <Text> component.'
]);
const Stack = createStackNavigator();

// [AuthNavigator, UserAppStack, DriverAppStack, linkingConfig - без змін]
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
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: { 
    screens: { 
        ResetPasswordScreen: 'reset-password',
        IndividualChat: 'chat/:roomId',
    } 
  },
};
// [Кінець: AuthNavigator, UserAppStack, DriverAppStack, linkingConfig]

function RootNavigator() {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const navigationRef = useRef(null);
    
    // --- ЛОГІКА ІНТЕРНЕТ-З'ЄДНАННЯ ---
    const netInfo = useNetInfo();
    const [isNetworkDown, setIsNetworkDown] = useState(false);
    const networkTimerRef = useRef(null);
    const DEBOUNCE_DELAY = 1500; 
    
    usePushNotifications(navigationRef);
    const { unreadCount, fetchUnreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();

    useEffect(() => {
        const isConnected = netInfo.isConnected && netInfo.isInternetReachable;

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
    // --- КІНЕЦЬ ЛОГІКИ ІНТЕРНЕТ-З'ЄДНАННЯ ---

    useEffect(() => {
        const checkOnboarding = async () => {
            const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
            setIsFirstLaunch(hasOnboarded === null);
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
                    supabase.from('chat_room_presences').upsert({ user_id: session.user.id, active_room_id: null, updated_at: new Date().toISOString() }).then();
                }
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        handleAppStateChange(AppState.currentState);
        return () => {
            appStateSubscription.remove();
        };
    }, [session, fetchUnreadCount]);

    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
                await Notifications.setBadgeCountAsync(totalBadgeCount);
            }
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);
    
    useEffect(() => {
        const handleDeepLink = (event) => {
            const url = event.url;
            if (!url || !navigationRef.current?.isReady()) return;
            const { path } = Linking.parse(url);
            if (path.includes('reset-password') && !session) {
                navigationRef.current.navigate('ResetPasswordScreen');
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => { subscription.remove(); };
    }, [session]);

    if (isAuthLoading || isFirstLaunch === null) {
        return null; 
    }

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer ref={navigationRef} linking={linkingConfig}>
                {session && profile ? (
                    profile.role === 'driver' ? <DriverAppStack /> : <UserAppStack />
                ) : (
                    <AuthNavigator isFirstLaunch={isFirstLaunch} />
                )}
            </NavigationContainer>
            {/* Банер тепер повністю керується станом isNetworkDown */}
            <NoInternetBanner visible={isNetworkDown} />
        </View>
    );
}

// -----------------------------------------------------------
// КОМПОНЕНТ: Спадаючий Банер NoInternetBanner
// -----------------------------------------------------------
const NoInternetBanner = memo(({ visible }) => {
    const { colors } = useTheme(); 
    const { t } = useTranslation(); 
    const animation = useRef(new Animated.Value(0)).current;
    // 💡 ВИПРАВЛЕНО: useSafeAreaInsets тепер доступний
    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = 80 + insets.top; // Динамічна висота для врахування safe area
    
    // Логіка анімації: реагує на visible
    useEffect(() => {
        Animated.timing(animation, {
            toValue: visible ? 1 : 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [visible, animation]);
    
    // Якщо банер приховано (анімація завершена), не рендеримо його
    if (!visible && animation._value === 0) return null;

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [-HEADER_HEIGHT, 0], 
    });

    const styles = getBannerStyles(colors, HEADER_HEIGHT, insets.top);
    
    return (
        <Animated.View style={[styles.bannerContainer, { transform: [{ translateY }] }]}>
            <View style={styles.content}>
                <Ionicons 
                    name="cloud-offline-outline" 
                    size={20} 
                    color={colors.text} 
                    style={styles.icon} 
                />
                <Text style={styles.title} numberOfLines={1}>
                    {t('errors.noInternetTitle') || 'Немає з\'єднання з Інтернетом'}
                </Text>
            </View>
           
        </Animated.View>
    );
});

const getBannerStyles = (colors, height, topInset) => StyleSheet.create({
    bannerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height,
        backgroundColor: colors?.danger || '#FF4444', 
        paddingTop: topInset,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        flexShrink: 1,
    },
    icon: {
        marginRight: 8,
    },
    title: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: colors?.text || '#fff', 
    },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 5,
    },
    buttonText: {
        color: colors?.text || '#fff', 
        fontWeight: 'bold', 
        fontSize: 14,
    }
});

export default function App() {
  return (
    // 💡 КЛЮЧОВЕ ВИПРАВЛЕННЯ
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