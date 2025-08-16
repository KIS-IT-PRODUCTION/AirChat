// app/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import InputWithIcon from './components/InputWithIcon'; // Переконайтесь, що шлях правильний

export default function LoginScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets, theme);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.fillAllFields', 'Please enter email and password.'));
      return;
    }
    setLoading(true);
    // Виклик signIn з AuthContext
    const { error } = await signIn({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(t('login.forgotPassword', 'Forgot Password?'), t('login.featureComingSoon', 'This feature is coming soon.'));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Адаптивна кнопка "скасувати" */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Ionicons name="close-outline" size={32} color={colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('login.title', 'Login')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle', 'Welcome back!')}</Text>
        </View>
        <View style={styles.form}>
          <InputWithIcon
            icon="mail-outline"
            placeholder={t('registration.emailPlaceholder', 'Email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputWithIcon
            icon="lock-closed-outline"
            placeholder={t('registration.passwordPlaceholder', 'Password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>{t('login.forgotPassword', 'Forgot Password?')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonText}>{t('auth.login', 'Login')}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t('login.noAccount', "Don't have an account?")} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegistrationScreen')}>
              <Text style={styles.signupLink}>{t('auth.register', 'Sign Up')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, insets, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  closeButton: {
    position: 'absolute',
    top: insets.top + 10,
    right: 20,
    zIndex: 10,
    padding: 5,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: colors.secondaryText, fontSize: 16, marginTop: 8 },
  form: { width: '100%', marginBottom: 20 },
  forgotPasswordText: {
    color: colors.primary,
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 20,
  },
  footer: { width: '100%', alignItems: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
