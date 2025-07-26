import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext.js';

export default function SupportScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth(); // Отримуємо дані сесії користувача
  const styles = getStyles(colors);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Функція для відправки повідомлення
  const handleSubmit = async () => {
    if (message.trim() === '') {
      Alert.alert(t('common.error'), t('support.messageEmpty'));
      return;
    }
    setLoading(true);

    // --- Імітація відправки на сервер ---
    // У реальному додатку тут буде запит до вашого бекенду або Supabase
    // await supabase.from('feedback').insert([{ email: session.user.email, message: message }])
    
    setTimeout(() => {
      setLoading(false);
      Alert.alert(t('common.success'), t('support.messageSent'));
      setMessage('');
      navigation.goBack();
    }, 1500); // Імітуємо затримку мережі
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Заголовок екрана */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('support.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{t('support.formTitle')}</Text>
            <Text style={styles.formSubtitle}>{t('support.formSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            {/* Поле Email (нередаговане) */}
            <Text style={styles.label}>{t('registration.emailLabel')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} />
              <Text style={styles.emailText}>{session?.user?.email}</Text>
            </View>

            {/* Поле Повідомлення */}
            <Text style={styles.label}>{t('support.messageLabel')}</Text>
            <TextInput
              style={styles.textArea}
              placeholder={t('support.messagePlaceholder')}
              placeholderTextColor={colors.secondaryText}
              value={message}
              onChangeText={setMessage}
              multiline={true}
              numberOfLines={6}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitButtonText}>
              {loading ? t('common.loading') : t('support.sendButton')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Динамічні стилі
const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
    },
    formHeader: {
      alignItems: 'center',
      marginBottom: 32,
    },
    formTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
    },
    formSubtitle: {
      color: colors.secondaryText,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 8,
    },
    form: {
      width: '100%',
      marginBottom: 32,
    },
    label: {
      color: colors.secondaryText,
      fontSize: 14,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 50,
      marginBottom: 20,
    },
    inputIcon: {
      marginRight: 12,
    },
    emailText: {
      color: colors.text,
      fontSize: 16,
    },
    textArea: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      height: 150,
      textAlignVertical: 'top',
      color: colors.text,
      fontSize: 16,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });