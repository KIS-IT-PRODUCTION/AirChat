import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert, // 1. Import Alert for user feedback
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';

// Reusable component for an input field with an icon
const InputWithIcon = ({ icon, placeholderKey, value, onChangeText, secureTextEntry = false, autoCapitalize = 'sentences' }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={t(placeholderKey)}
        placeholderTextColor={colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

export default function RegistrationScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { signUp } = useAuth(); // 3. Get the signUp function from the context
  const styles = getStyles(colors);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false); // 4. Add loading state

  // 5. Create the handler function for registration
  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('registration.emailPasswordRequired'));
      return;
    }
    setLoading(true);
    const { error } = await signUp({
      email: email,
      password: password,
      options: {
        // You can pass additional user metadata here
        data: {
          full_name: fullName,
          phone: phone,
        }
      }
    });

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      // Supabase sends a confirmation email by default.
      Alert.alert(t('common.success'), t('registration.confirmationEmail'));
      navigation.goBack(); // Go back to the previous screen
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('registration.title')}</Text>
          <Text style={styles.subtitle}>{t('registration.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('registration.fullNameLabel')}</Text>
          <InputWithIcon
            icon="person-outline"
            placeholderKey="registration.fullNamePlaceholder"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>{t('registration.emailLabel')}</Text>
          <InputWithIcon
            icon="mail-outline"
            placeholderKey="registration.emailPlaceholder"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('registration.passwordLabel')}</Text>
          <InputWithIcon
            icon="lock-closed-outline"
            placeholderKey="registration.passwordPlaceholder"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>{t('registration.phoneLabel')}</Text>
          <InputWithIcon
            icon="call-outline"
            placeholderKey="registration.phonePlaceholder"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.footer}>
          {/* 6. Update the button to use the handler and loading state */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            <Text style={styles.registerButtonText}>
              {loading ? t('common.loading') : t('registration.registerButton')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.loginLink}>
              {t('registration.alreadyRegistered')}{' '}
              <Text style={{ color: colors.primary }}>{t('registration.loginLink')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginTop: 20,
    },
    title: {
      color: colors.text,
      fontSize: 32,
      fontWeight: 'bold',
    },
    subtitle: {
      color: colors.secondaryText,
      fontSize: 16,
      marginTop: 8,
    },
    form: {
      marginTop: 40,
    },
    label: {
      color: colors.text,
      fontSize: 14,
      marginBottom: 8,
      marginLeft: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 20,
      paddingHorizontal: 12,
    },
    inputIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      height: 50,
    },
    footer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    registerButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      width: '100%',
      alignItems: 'center',
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
    loginLink: {
      color: colors.secondaryText,
      fontSize: 14,
      marginTop: 24,
    },
  });