// app/RegistrationScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Імпорт для адаптації
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import InputWithIcon from './components/InputWithIcon'; // Переконайтесь, що шлях правильний

export default function RegistrationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets(); // Отримуємо безпечні відступи екрана
  const styles = getStyles(colors, insets); // Передаємо відступи в стилі
  const { signUp } = useAuth();

  const { role } = route.params || { role: 'client' };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      Alert.alert(t('common.error'), t('registration.fillAllFields', 'Please fill in your full name, email, and password.'));
      return;
    }
    setLoading(true);
    const { error } = await signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: role,
        }
      }
    });

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('registration.confirmationEmail', 'Please check your email to confirm your registration.'));
      navigation.navigate('LoginScreen');
    }
    setLoading(false);
  };
  
  const title = role === 'driver' 
    ? t('registration.driverTitle', 'Driver Registration') 
    : t('registration.title', 'Create Account');

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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{t('registration.subtitle', 'Let\'s get you started!')}</Text>
        </View>

        <View style={styles.form}>
           <Text style={styles.label}>{t('registration.fullNameLabel', 'Full Name')}</Text>
          <InputWithIcon
            icon="person-outline"
            placeholderKey="registration.fullNamePlaceholder"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>{t('registration.emailLabel', 'Email')}</Text>
          <InputWithIcon
            icon="mail-outline"
            placeholderKey="registration.emailPlaceholder"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('registration.passwordLabel', 'Password')}</Text>
          <InputWithIcon
            icon="lock-closed-outline"
            placeholderKey="registration.passwordPlaceholder"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>{t('registration.phoneLabel', 'Phone (Optional)')}</Text>
          <InputWithIcon
            icon="call-outline"
            placeholderKey="registration.phonePlaceholder"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            <Text style={styles.registerButtonText}>
              {loading ? t('common.loading', 'Registering...') : t('registration.registerButton', 'Register')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')} disabled={loading}>
            <Text style={styles.loginLink}>
              {t('registration.alreadyRegistered', 'Already have an account?')}
              {' '}
              <Text style={{ color: colors.primary }}>{t('registration.loginLink', 'Log In')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      // Використовуємо відступ зверху від безпечної зони + невеликий зазор
      top: insets.top + 10, 
      right: 20,
      zIndex: 10,
      padding: 5, // Збільшуємо область натискання для зручності
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: 24,
      paddingTop: 60, // Залишаємо місце для кнопки та заголовка
    },
    header: {
      alignItems: 'center',
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
