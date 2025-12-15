import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { supabase } from '../../config/supabase';
import InputWithIcon from './InputWithIcon';

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handlePasswordReset = async () => {
    Keyboard.dismiss();
    setErrorText('');

    if (!validateEmail(email)) {
      setErrorText(t('login.invalidEmailFormat'));
      return;
    }

    setLoading(true);
    // ✨ 1. Змінюємо метод: тепер надсилаємо OTP-код
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      options: {
        // redirectTo більше не потрібен
      },
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
    } else {
      // ✨ 2. При успішному надсиланні перенаправляємо на екран введення коду
      navigation.navigate('ResetPasswordScreen', { email: email.trim().toLowerCase() });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back-outline" size={32} color={colors.text} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Ionicons name="key-outline" size={64} color={colors.primary} />
              <Text style={styles.title}>{t('forgotPassword.title', 'Забули пароль?')}</Text>
              <Text style={styles.subtitle}>{t('forgotPassword.subtitleOtp', 'Введіть вашу пошту, і ми надішлемо код для відновлення.')}</Text>
            </View>
            <View style={styles.form}>
              <InputWithIcon
                  icon="mail-outline"
                  placeholder={t('registration.emailPlaceholder')}
                  value={email}
                  onChangeText={(text) => { setEmail(text); setErrorText(''); }}
                  keyboardType="email-address" 
                  autoCapitalize="none"
              />
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.button} onPress={handlePasswordReset} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('forgotPassword.sendButtonOtp', 'Надіслати код')}</Text>}
              </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, insets) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingContainer: { flex: 1 },
  closeButton: { position: 'absolute', top: insets.top + 10, left: 20, zIndex: 10, padding: 5 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  subtitle: { color: colors.secondaryText, fontSize: 16, marginTop: 8, textAlign: 'center' },
  form: { width: '100%', marginBottom: 10 },
  errorText: { color: '#D32F2F', textAlign: 'center', marginBottom: 20, fontSize: 14, fontWeight: '500' },
  footer: { width: '100%', alignItems: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});