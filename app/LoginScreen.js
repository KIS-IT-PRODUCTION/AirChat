import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { MotiView, AnimatePresence } from 'moti';

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

const InputWithIcon = ({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, secureTextEntry, onToggleVisibility, isPassword }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, {}, theme);

    return (
        <View style={styles.inputContainer}>
            <Ionicons name={icon} size={22} color={colors.secondaryText} style={styles.inputIcon} />
            <TextInput
                style={styles.textInput}
                placeholder={placeholder}
                placeholderTextColor={colors.secondaryText}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                secureTextEntry={secureTextEntry}
            />
            {isPassword ? (
                <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
                    <Ionicons name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'} size={24} color={colors.secondaryText} />
                </TouchableOpacity>
            ) : (
                <View style={styles.eyeIconPlaceholder} />
            )}
        </View>
    );
};

const LoginScreen = ({ navigation }) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets, theme);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleLogin = useCallback(async () => {
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
  }, [email, password, signIn, t]);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate('ForgotPasswordScreen');
  }, [navigation]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate('HomeScreen')}>
        <Ionicons name="close-outline" size={32} color={colors.text} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('login.title', 'Вхід')}</Text>
              <Text style={styles.subtitle}>{t('login.subtitle', 'Раді бачити вас знову!')}</Text>
            </View>
            <View style={styles.form}>
              <InputWithIcon
                  icon="mail-outline"
                  placeholder={t('registration.emailPlaceholder', 'Електронна пошта')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address" 
                  autoCapitalize="none"
              />
              <InputWithIcon
                  icon="lock-closed-outline"
                  placeholder={t('registration.passwordPlaceholder', 'Пароль')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  isPassword={true}
                  onToggleVisibility={togglePasswordVisibility}
              />
              <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>{t('login.forgotPassword', 'Забули пароль?')}</Text>
              </TouchableOpacity>
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
              {/* ✅ 1. ОНОВЛЕННЯ КНОПКИ: Додано анімацію завантаження */}
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <AnimatePresence exitBeforeEnter>
                  {loading ? (
                    <MotiView
                      key="indicator"
                      from={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <ActivityIndicator color="#FFFFFF" />
                    </MotiView>
                  ) : (
                    <MotiView
                      key="text"
                      from={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                    >
                      <Text style={styles.buttonText}>{t('auth.login', 'Увійти')}</Text>
                    </MotiView>
                  )}
                </AnimatePresence>
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

export default React.memo(LoginScreen);

const getStyles = (colors, insets, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background},
  keyboardAvoidingContainer: { flex: 1 },
  closeButton: { position: 'absolute', top: insets.top + 10, right: 20, zIndex: 10, padding: 5 },
  // --- 👇 ОНОВЛЕНО: Додано 'justifyContent' для центрування ---
  scrollContainer: { 
    flexGrow: 1, 
    padding: 24, 
    justifyContent: 'center' // Це центрує форму по вертикалі
  },
  // ---
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: colors.secondaryText, fontSize: 16, marginTop: 8 },
  form: { width: '100%', marginBottom: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, height: 50, color: colors.text, fontSize: 16 },
  eyeIcon: {
    padding: 5,
    width: 34, 
    alignItems: 'center',
  },
  eyeIconPlaceholder: {
    padding: 5, 
    width: 34, 
  },
  forgotPasswordText: { color: colors.primary, textAlign: 'center', fontWeight: '600', margin: 10 },
  errorText: { color: '#D32F2F', textAlign: 'center', marginBottom: 20, fontSize: 14, fontWeight: '500' },
  footer: { width: '100%', alignItems: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: '100%',
    height: 55, // Фіксована висота
    justifyContent: 'center', // Центрування контенту
    alignItems: 'center',
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
        android: { elevation: 5 },
    }),
  },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 24, alignItems: 'center' },
  signupText: { color: colors.secondaryText, fontSize: 14 },
  signupLink: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
});