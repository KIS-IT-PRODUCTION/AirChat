import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import { supabase } from '../../config/supabase';
import InputWithIcon from './InputWithIcon';

export default function ResetPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleUpdatePassword = async () => {
    Keyboard.dismiss();
    setErrorText('');

    if (password.length < 6) {
      setErrorText(t('registration.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorText(t('resetPassword.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
    } else {
      // ✨ КЛЮЧОВЕ ВИПРАВЛЕННЯ: Просто показуємо повідомлення.
      // Навігація відбудеться автоматично, коли AuthProvider побачить нову сесію.
      Alert.alert(
        t('common.success'),
        t('resetPassword.successMessage', 'Ваш пароль успішно оновлено!')
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
       {/* Кнопка "назад" тепер не потрібна, оскільки користувач не може "вийти" з цього стану */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Ionicons name="lock-open-outline" size={64} color={colors.primary} />
              <Text style={styles.title}>{t('resetPassword.title', 'Створити новий пароль')}</Text>
              <Text style={styles.subtitle}>{t('resetPassword.subtitle', 'Ваш новий пароль має відрізнятись від попереднього.')}</Text>
            </View>

            <View style={styles.form}>
              <InputWithIcon
                  icon="lock-closed-outline"
                  placeholder={t('resetPassword.newPassword', 'Новий пароль')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
              />
              <InputWithIcon
                  icon="lock-closed-outline"
                  placeholder={t('resetPassword.confirmPassword', 'Підтвердіть пароль')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
              />
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={loading}>
                  {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                  ) : (
                  <Text style={styles.buttonText}>{t('resetPassword.updateButton', 'Оновити пароль')}</Text>
                  )}
              </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ... (стилі без змін)
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
