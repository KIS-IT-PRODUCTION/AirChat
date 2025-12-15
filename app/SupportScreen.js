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
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path } from 'react-native-svg'; // Імпортуємо для ілюстрації

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext.js';

// --- Компонент для ілюстрації ---
const SupportIllustration = ({ colors }) => (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Svg height="150" width="150" viewBox="0 0 24 24">
            <Path 
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.51l8 5 8-5V6H4zm0 12h16V8.51l-8 5-8-5V18z" 
                fill={colors.primary}
            />
        </Svg>
    </View>
);

export default function SupportScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const styles = getStyles(colors);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (message.trim() === '') {
      Alert.alert(t('common.error'), t('support.messageEmpty'));
      return;
    }
    setLoading(true);
    
    // У реальному додатку тут буде запит до вашого бекенду
    // await supabase.from('feedback').insert([{ user_id: session.user.id, message: message }])
    
    setTimeout(() => {
      setLoading(false);
      Alert.alert(t('common.success'), t('support.messageSent'));
      setMessage('');
      navigation.goBack();
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <SupportIllustration colors={colors} />
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{t('support.formTitle')}</Text>
            <Text style={styles.formSubtitle}>{t('support.formSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('registration.emailLabel')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} />
              <Text style={styles.emailText}>{session?.user?.email || 'email@example.com'}</Text>
            </View>

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
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <>
                    <Ionicons name="send-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>{t('support.sendButton')}</Text>
                </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
       paddingTop: Platform.OS === 'android' ? 25 : 0 
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
    },
    formHeader: {
      alignItems: 'center',
      marginBottom: 32,
    },
    formTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
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
      marginLeft: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 50,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: 12,
    },
    emailText: {
      color: `${colors.text}99`, // Трохи прозоріший текст для email
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
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButton: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
