import 'react-native-google-places-autocomplete';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n'; // Переконайтеся, що цей файл існує

import React, { useState, useEffect, memo, useRef } from 'react';
import { 
    NavigationContainer, 
    useNavigationContainerRef, 
    DefaultTheme,
    DarkTheme     
} from '@react-navigation/native'; 
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    View, StyleSheet, Text, AppState, Platform, Animated, Easing, StatusBar,
    Modal, TouchableOpacity 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking'; 
import { LogBox } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

// Провайдери
import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import HomeScreen, { FormProvider } from './app/HomeScreen';
import { usePushNotifications } from './usePushNotifications.js';
import { supabase } from './config/supabase';

// Екрани
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

// --- Deep Linking (без змін) ---
const linkingConfig = {
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: { screens: { ResetPasswordScreen: 'reset-password', IndividualChat: 'chat/:roomId' } },
};

// --- Модальне вікно для забанених (без змін) ---
const BannedUserModal = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const handleContactSupport = () => {
    const adminEmail = 'airchat.app25@gmail.com'; 
    const subject = t('bannedModal.emailSubject', 'Мій акаунт заблоковано');
    Linking.openURL(`mailto:${adminEmail}?subject=${subject}`);
  };

  const styles = getBannedModalStyles(colors);

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Ionicons name="ban-outline" size={80} color={colors.danger} />
          <Text style={styles.title}>{t('bannedModal.title', 'Акаунт заблоковано')}</Text>
          <Text style={styles.message}>
            {t('bannedModal.message', 'Ваш акаунт було заблоковано адміністратором через порушення правил спільноти. Ви не можете користуватися додатком.')}
          </Text>
          <Text style={styles.message}>
            {t('bannedModal.contact', 'Якщо ви вважаєте, що це помилка, будь ласка, зв\'яжіться з підтримкою airchat.app25@gmail.com.')}
          </Text>

          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Text style={styles.buttonText}>{t('bannedModal.contactButton', "Зв'язатися з підтримкою")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Text style={styles.logoutText}>{t('bannedModal.logout', 'Вийти')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
// Стилі для модального вікна (без змін)
const getBannedModalStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
  },
  logoutText: {
    color: colors.secondaryText,
    fontSize: 15,
    fontWeight: '500',
  },
});


// --- AppContent (без змін) ---
function AppContent({ navigationRef }) {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const { colors } = useTheme(); 
    usePushNotifications(navigationRef); 
    const { unreadCount, fetchUnreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();
    const netInfo = useNetInfo();
    const [isNetworkDown, setIsNetworkDown] = useState(false);

    // Ефекти (без змін)
    useEffect(() => {
        const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable === true;
        if (netInfo.type !== 'unknown') { setIsNetworkDown(!isConnected); }
    }, [netInfo.isConnected, netInfo.isInternetReachable, netInfo.type]);
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
            if (session?.user && nextAppState === 'active') {
                supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();
                fetchUnreadCount();
            }
        };
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        return () => { appStateSubscription.remove(); };
    }, [session, fetchUnreadCount]);
    useEffect(() => {
        const updateTotalBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                const totalBadgeCount = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
                await Notifications.setBadgeCountAsync(Math.max(0, totalBadgeCount));
            }
        };
        updateTotalBadgeCount();
    }, [unreadCount, newOffersCount, newTripsCount]);

    // Відображаємо null, поки йде перше завантаження
    if (isAuthLoading || isFirstLaunch === null) {
        return null;
    }

    // Перевірка на бан (без змін)
    if (profile && profile.is_banned) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
                <BannedUserModal />
            </View>
        );
    }
    // --- Кінець перевірки на бан ---

    return (
        <View style={{ flex: 1 }}>
            <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
            {session && profile ? (
                profile.role === 'driver' ? <DriverAppStack /> : <UserAppStack />
            ) : (
                <AuthNavigator isFirstLaunch={isFirstLaunch} />
            )}
            {/* 👇 Переконайтеся, що NoInternetBanner рендериться тут */}
            <NoInternetBanner visible={isNetworkDown} />
        </View>
    );
}

// --- 👇 ОНОВЛЕНИЙ КОМПОНЕНТ БАНЕРА ---
const NoInternetBanner = memo(({ visible }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const topInset = useSafeAreaInsets().top;

    // Визначаємо висоту контенту та позиції
    const contentHeight = 50;
    const visibleY = topInset + 10; // 10px відступу від статус-бару
    const hiddenY = -(contentHeight + topInset + 20); // Повністю сховано за екраном

    // Починаємо зі схованої позиції
    const animation = useRef(new Animated.Value(hiddenY)).current;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: visible ? visibleY : hiddenY, // Анімуємо до видимої або схованої позиції
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true, // Використовуємо transform
        }).start();
    }, [visible, animation, visibleY, hiddenY]);
    
    // 👇 Передаємо тільки 'colors' у функцію стилів
    const styles = getBannerStyles(colors); 

    return (
        <Animated.View style={[styles.bannerContainer, { transform: [{ translateY: animation }] }]}>
            {/* 'contentContainer' тепер має всі стилі (тінь, колір, заокруглення) */}
            <View style={styles.contentContainer}>
                <Ionicons name="cloud-offline-outline" size={22} color={colors.white} />
                <Text style={styles.bannerText}>{t('errors.noInternetTitle', 'Немає з\'єднання з Інтернетом')}</Text>
            </View>
        </Animated.View>
    );
});

// --- 👇 ОНОВЛЕНІ СТИЛІ БАНЕРА ---
const getBannerStyles = (colors) => StyleSheet.create({
    bannerContainer: {
        position: 'absolute',
        top: 0,
        left: 16, // Відступ зліва
        right: 16, // Відступ справа
        zIndex: 1000,
    },
    contentContainer: {
        height: 50, // Фіксована висота
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#e14932ff', // Червоний колір
        borderRadius: 12, // Заокруглені кути
        // Красива тінь
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    bannerText: {
        color: colors.white, // Білий текст
        marginLeft: 10,
        fontWeight: 'bold',
        fontSize: 15,
    },
});

// --- ThemedNavigationContainer (без змін) ---
function ThemedNavigationContainer() {
  const navigationRef = useNavigationContainerRef();
  const { colors, isDark } = useTheme(); 

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer 
        linking={linkingConfig} 
        ref={navigationRef}
        theme={navigationTheme} 
    >
        <AppContent navigationRef={navigationRef} />
    </NavigationContainer>
  );
}


// --- Головний компонент Додатку (без змін) ---
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UnreadCountProvider>
            <NewOffersProvider>
              <NewTripsProvider>
                  <FormProvider>
                      <ThemedNavigationContainer />
                  </FormProvider>
              </NewTripsProvider>
            </NewOffersProvider>
          </UnreadCountProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}