import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { supabase } from '../../config/supabase';
import InputWithIcon from './InputWithIcon';

export default function ResetPasswordScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);

  // ✨ 1. Отримуємо email з параметрів навігації
  const { email } = route.params;

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleUpdatePassword = async () => {
    Keyboard.dismiss();
    setErrorText('');

    if (!token || !password) {
        setErrorText(t('login.fillAllFields'));
        return;
    }
    if (password.length < 6) {
      setErrorText(t('registration.passwordTooShort'));
      return;
    }

    setLoading(true);
    // ✨ 2. Нова логіка: верифікуємо OTP і оновлюємо пароль
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (error) {
        setErrorText(t('resetPassword.invalidToken', 'Неправильний або застарілий код.'));
        setLoading(false);
        return;
    }

    // Якщо код правильний, оновлюємо пароль
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setErrorText(updateError.message);
    } else {
      Alert.alert(
        t('common.success'),
        t('resetPassword.successMessage'),
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate('LoginScreen')}>
        <Ionicons name="arrow-back-outline" size={32} color={colors.text} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Ionicons name="lock-open-outline" size={64} color={colors.primary} />
              <Text style={styles.title}>{t('resetPassword.titleOtp', 'Введіть код')}</Text>
              <Text style={styles.subtitle}>{t('resetPassword.subtitleOtp', 'Ми надіслали 6-значний код на вашу пошту.')}</Text>
            </View>

            <View style={styles.form}>
              <InputWithIcon
                  icon="shield-checkmark-outline"
                  placeholder={t('resetPassword.tokenPlaceholder', 'Код з пошти')}
                  value={token}
                  onChangeText={setToken}
                  keyboardType="number-pad"
              />
              <InputWithIcon
                  icon="lock-closed-outline"
                  placeholder={t('resetPassword.newPassword')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
              />
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{t('resetPassword.updateButton')}</Text>}
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