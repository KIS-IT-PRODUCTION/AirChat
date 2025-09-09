import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import InputWithIcon from './components/InputWithIcon';

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export default function LoginScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets, theme);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleLogin = async () => {
    Keyboard.dismiss();
    setErrorText('');

    if (!email || !password) {
      setErrorText(t('login.fillAllFields', 'Будь ласка, заповніть усі поля.'));
      return;
    }
    if (!validateEmail(email)) {
      setErrorText(t('login.invalidEmailFormat', 'Введіть коректну адресу пошти.'));
      return;
    }

    setLoading(true);
    const { error } = await signIn({ email, password });
    setLoading(false);

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErrorText(t('login.invalidCredentials', 'Неправильна електронна пошта або пароль.'));
      } else if (error.message === 'Email not confirmed') {
        setErrorText(t('login.emailNotConfirmed', 'Підтвердіть вашу пошту, перевіривши вхідні листи.'));
      } else {
        setErrorText(error.message);
      }
    }
  };

  // ✨ Виправлено навігацію на новий екран
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPasswordScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Ionicons name="close-outline" size={32} color={colors.text} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
            <Text style={styles.title}>{t('login.title', 'Вхід')}</Text>
            <Text style={styles.subtitle}>{t('login.subtitle', 'Раді бачити вас знову!')}</Text>
            </View>
            <View style={styles.form}>
            <InputWithIcon
                icon="mail-outline"
                placeholder={t('registration.emailPlaceholder', 'Електронна пошта')}
                value={email}
                onChangeText={(text) => {
                setEmail(text);
                if (errorText) setErrorText('');
                }}
                keyboardType="email-address" 
                autoCapitalize="none"
            />
            <InputWithIcon
                icon="lock-closed-outline"
                placeholder={t('registration.passwordPlaceholder', 'Пароль')}
                value={password}
                onChangeText={(text) => {
                setPassword(text);
                if (errorText) setErrorText('');
                }}
                secureTextEntry
            />
            <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>{t('login.forgotPassword', 'Забули пароль?')}</Text>
            </TouchableOpacity>
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? (
                <ActivityIndicator color="#FFFFFF" />
                ) : (
                <Text style={styles.buttonText}>{t('auth.login', 'Увійти')}</Text>
                )}
            </TouchableOpacity>
            <View style={styles.signupContainer}>
                <Text style={styles.signupText}>{t('login.noAccount', "Немає акаунту?")} </Text>
                <TouchableOpacity onPress={() => navigation.navigate('RegistrationScreen')}>
                <Text style={styles.signupLink}>{t('auth.register', 'Зареєструватись')}</Text>
                </TouchableOpacity>
            </View>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, insets, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingContainer: {
    flex: 1,
  },
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
  form: { width: '100%', marginBottom: 10 },
  forgotPasswordText: {
    color: colors.primary,
    textAlign: 'right',
    fontWeight: '600',
    marginTop: 8,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: { width: '100%', alignItems: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
        android: { elevation: 5 },
    }),
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

