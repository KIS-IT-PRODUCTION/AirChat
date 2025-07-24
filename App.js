import 'react-native-gesture-handler';
import './i18n'; 
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

// 1. ВИПРАВЛЕНО: Всі провайдери імпортуються з єдиної папки 'app/context/'
import { ThemeProvider } from './app//ThemeContext';
import { AuthProvider } from './provider/AuthContext';

// 2. ВИПРАВЛЕНО: Всі екрани імпортуються з єдиної папки 'app/screens/'
import HomeScreen from './app/HomeScreen';
import OnboardingScreen from './app/OnboardingScreen';
import AuthScreen from './app/AuthScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null);

  useEffect(() => {
    const checkIfFirstLaunch = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');
        if (hasOnboarded === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (e) {
        console.error('Failed to check onboarding status', e);
        setIsFirstLaunch(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkIfFirstLaunch();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
          <NavigationContainer>
            {/* 3. ВИПРАВЛЕНО: Назви екранів тепер короткі та відповідають initialRouteName */}
            <Stack.Navigator initialRouteName={isFirstLaunch ? 'Onboarding' : 'HomeScreen'}>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="HomeScreen" // Тепер ця назва відповідає 'Home' в initialRouteName
                component={HomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}