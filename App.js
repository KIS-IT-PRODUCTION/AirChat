import 'react-native-google-places-autocomplete';
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import './i18n'; 

import React, { useState, useEffect, memo, useMemo } from 'react';
import { 
    NavigationContainer, 
    useNavigationContainerRef, 
    DefaultTheme,
    DarkTheme     
} from '@react-navigation/native'; 
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    View, StyleSheet, Text, AppState, StatusBar,
    Modal, TouchableOpacity 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking'; 
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { ThemeProvider, useTheme } from './app/ThemeContext';
import { AuthProvider, useAuth } from './provider/AuthContext';
import { UnreadCountProvider, useUnreadCount } from './provider/Unread Count Context';
import { NewOffersProvider, useNewOffers } from './provider/NewOffersContext';
import { NewTripsProvider, useNewTrips } from './provider/NewTripsContext';
import HomeScreen, { FormProvider } from './app/HomeScreen';
import { usePushNotifications } from './usePushNotifications.js';
import { UserStatusProvider } from './UserStatusContext'; 

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
import InstructionsScreen from './app/InstructionsScreen.js';

enableScreens();
SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Warning: Text strings must be rendered within a <Text> component.']);

const Stack = createStackNavigator();

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
            <Stack.Screen name="Instructions" component={InstructionsScreen} />
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
            <Stack.Screen name="Instructions" component={InstructionsScreen} />
        </Stack.Navigator>
    );
}

const linkingConfig = {
  prefixes: [Linking.createURL('/'), 'airchat://'],
  config: { screens: { ResetPasswordScreen: 'reset-password', IndividualChat: 'chat/:roomId' } },
};

const BannedUserModal = memo(() => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { signOut } = useAuth();

  const handleContactSupport = () => {
    Linking.openURL(`mailto:airchat.app25@gmail.com?subject=${t('bannedModal.emailSubject', 'Мій акаунт заблоковано')}`);
  };

  const styles = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { backgroundColor: colors.card, borderRadius: 20, padding: 30, alignItems: 'center', width: '100%', elevation: 5, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.25, shadowRadius:4 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#ef4444', marginTop: 20, marginBottom: 10, textAlign: 'center' },
    message: { fontSize: 16, color: colors.secondaryText, textAlign: 'center', marginBottom: 15, lineHeight: 22 },
    contactButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, width: '100%', alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    logoutButton: { marginTop: 20, padding: 10 },
    logoutText: { color: colors.secondaryText, fontSize: 15, fontWeight: '500' },
  }), [colors]);

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <Ionicons name="ban-outline" size={80} color="#ef4444" />
          <Text style={styles.title}>{t('bannedModal.title', 'Акаунт заблоковано')}</Text>
          <Text style={styles.message}>{t('bannedModal.message', 'Ваш акаунт було заблоковано адміністратором.')}</Text>
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
});

function AppContent({ navigationRef }) {
    const { session, profile, isLoading: isAuthLoading } = useAuth();
    const [isFirstLaunch, setIsFirstLaunch] = useState(null);
    const { colors } = useTheme(); 
    const { unreadCount, fetchUnreadCount } = useUnreadCount();
    const { newOffersCount } = useNewOffers();
    const { newTripsCount } = useNewTrips();

    usePushNotifications(navigationRef); 

    useEffect(() => {
        AsyncStorage.getItem('hasOnboarded').then(val => setIsFirstLaunch(val === null));
    }, []);

    useEffect(() => {
        let timeout;
        if (!isAuthLoading && isFirstLaunch !== null) {
            SplashScreen.hideAsync();
        } else {
            timeout = setTimeout(() => {
                SplashScreen.hideAsync();
            }, 3000); 
        }
        return () => clearTimeout(timeout);
    }, [isAuthLoading, isFirstLaunch]);

    useEffect(() => {
        const sub = AppState.addEventListener('change', next => {
            if (session?.user && next === 'active') fetchUnreadCount();
        });
        return () => sub.remove();
    }, [session, fetchUnreadCount]);

    useEffect(() => {
        const total = (unreadCount || 0) + (newOffersCount || 0) + (newTripsCount || 0);
        Notifications.setBadgeCountAsync(total).catch(() => {});
    }, [unreadCount, newOffersCount, newTripsCount]);

    if (isAuthLoading || isFirstLaunch === null) return null;

    if (profile?.is_banned) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
                <BannedUserModal />
            </View>
        );
    }

   return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle={colors.statusBar} translucent backgroundColor="transparent" />
            {session && profile ? (
                profile.role === 'driver' ? (
                    <DriverAppStack key="driver-stack" />
                ) : (
                    <UserAppStack key="user-stack" />
                )
            ) : (
                <AuthNavigator isFirstLaunch={isFirstLaunch} key="auth-stack" />
            )}
        </View>
    );
}

function ThemedNavigationContainer() {
  const navigationRef = useNavigationContainerRef();
  const { colors, isDark } = useTheme(); 

  const navigationTheme = useMemo(() => ({
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...colors, primary: colors.primary, background: colors.background, card: colors.card, text: colors.text, border: colors.border, notification: colors.primary },
  }), [colors, isDark]);

  return (
    <NavigationContainer linking={linkingConfig} ref={navigationRef} theme={navigationTheme}>
        <AppContent navigationRef={navigationRef} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UserStatusProvider>
            <UnreadCountProvider>
                <NewOffersProvider>
                <NewTripsProvider>
                    <FormProvider>
                        <ThemedNavigationContainer />
                    </FormProvider>
                </NewTripsProvider>
                </NewOffersProvider>
            </UnreadCountProvider>
          </UserStatusProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}