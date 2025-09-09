import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase'; // Імпортуємо supabase для прямого запиту
import InputWithIcon from './components/InputWithIcon';

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

export default function RegistrationScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);
  const { signUp } = useAuth();

  const { role } = route.params || { role: 'client' };

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  // ✨ 1. Нові стани для перевірки пошти в реальному часі
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState(true);
  const debounceTimeout = useRef(null);

  // ✨ 2. Функція для перевірки пошти з затримкою (debounce)
  useEffect(() => {
    // Очищуємо попередній таймер при кожній зміні
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    // Не перевіряємо, якщо пошта некоректна або порожня
    if (!email.trim() || !validateEmail(email)) {
      setIsEmailAvailable(true); // Скидаємо, щоб не показувати помилку
      setErrorText('');
      return;
    }

    // Встановлюємо новий таймер
    debounceTimeout.current = setTimeout(async () => {
      setIsCheckingEmail(true);
      setErrorText('');
      try {
        // ✨ ПРАВИЛЬНИЙ СПОСІБ: Викликаємо RPC функцію в Supabase.
        // Цю функцію потрібно створити у вашому SQL Editor в Supabase.
        // Дивіться коментар в кінці файлу для SQL коду функції.
        const { data, error } = await supabase.rpc('email_exists', {
          email_to_check: email.trim().toLowerCase()
        });
        
        if (error) throw error;
        
        // data буде true, якщо пошта існує, і false, якщо ні.
        setIsEmailAvailable(!data); 

      } catch (error) {
        console.error("Error checking email via RPC:", error.message);
        // У випадку помилки, не блокуємо реєстрацію, довіряємось валідації на сервері
        setIsEmailAvailable(true);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500); // Затримка в 500 мс

    return () => clearTimeout(debounceTimeout.current);
  }, [email]);

  const handleRegister = async () => {
    Keyboard.dismiss();
    setErrorText('');

    if (!email || !password || !fullName) {
      setErrorText(t('registration.fillAllFields', 'Будь ласка, заповніть ім\'я, пошту та пароль.'));
      return;
    }
    if (!validateEmail(email)) {
      setErrorText(t('login.invalidEmailFormat', 'Введіть коректну адресу пошти.'));
      return;
    }
    if (password.length < 6) {
      setErrorText(t('registration.passwordTooShort', 'Пароль має містити щонайменше 6 символів.'));
      return;
    }
    if (!isEmailAvailable) {
        setErrorText(t('registration.emailExists', 'Користувач з такою поштою вже існує.'));
        return;
    }

    setLoading(true);
    const { error } = await signUp({
      email: email.trim(),
      password: password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim(), role: role } }
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message.includes('User already registered')
        ? t('registration.emailExists', 'Користувач з такою поштою вже існує.')
        : error.message
      );
    } else {
      Alert.alert(
        t('common.success'), 
        t('registration.confirmationEmail', 'На вашу пошту надіслано лист для підтвердження. Перевірте його, будь ласка.'),
        [{ text: 'OK', onPress: () => navigation.navigate('LoginScreen') }]
      );
    }
  };
  
  const title = role === 'driver' ? t('registration.driverTitle') : t('registration.title');
  const clearError = () => { if (errorText) setErrorText(''); };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate('HomeScreen')}>
        <Ionicons name="close-outline" size={32} color={colors.text} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{t('registration.subtitle', 'Давайте розпочнемо!')}</Text>
            </View>

            <View style={styles.form}>
              <InputWithIcon
                icon="person-outline"
                placeholder={t('registration.fullNamePlaceholder', "Ваше повне ім'я")}
                value={fullName}
                onChangeText={(text) => { setFullName(text); clearError(); }}
              />
              <View style={styles.inputContainer}>
                  <InputWithIcon
                    icon="mail-outline"
                    placeholder={t('registration.emailPlaceholder', 'Електронна пошта')}
                    value={email}
                    onChangeText={(text) => { setEmail(text); clearError(); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerStyle={{ flex: 1 }}
                  />
                  <View style={styles.validationIndicator}>
                      {isCheckingEmail ? (
                          <ActivityIndicator size="small" color={colors.secondaryText} />
                      ) : (email.length > 2 && validateEmail(email)) ? (
                          <Ionicons
                              name={isEmailAvailable ? "checkmark-circle-outline" : "close-circle-outline"}
                              size={24}
                              color={isEmailAvailable ? '#2E7D32' : '#D32F2F'}
                          />
                      ) : null}
                  </View>
              </View>
              <InputWithIcon
                icon="lock-closed-outline"
                placeholder={t('registration.passwordPlaceholder', 'Пароль')}
                value={password}
                onChangeText={(text) => { setPassword(text); clearError(); }}
                secureTextEntry
              />
              <InputWithIcon
                icon="call-outline"
                placeholder={t('registration.phonePlaceholder', 'Телефон (необов\'язково)')}
                value={phone}
                onChangeText={(text) => { setPhone(text); clearError(); }}
                keyboardType="phone-pad"
              />
            </View>
            
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading || isCheckingEmail}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.registerButtonText}>{t('registration.registerButton', 'Зареєструватись')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')} disabled={loading}>
                <Text style={styles.loginLink}>
                  {t('registration.alreadyRegistered', 'Вже маєте акаунт?')}
                  {' '}
                  <Text style={{ color: colors.primary }}>{t('registration.loginLink', 'Увійти')}</Text>
                </Text>
              </TouchableOpacity>
            </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    keyboardAvoidingContainer: { flex: 1 },
    closeButton: { position: 'absolute', top: insets.top + 10, right: 20, zIndex: 10, padding: 5 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 30 },
    title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
    subtitle: { color: colors.secondaryText, fontSize: 16, marginTop: 8 },
    form: {},
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    validationIndicator: {
        width: 40,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        right: 10,
        top: 8,
    },
    errorText: { color: '#D32F2F', textAlign: 'center', marginBottom: 20, fontSize: 14, fontWeight: '500' },
    footer: { alignItems: 'center', marginTop: 20 },
    registerButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
    registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    loginLink: { color: colors.secondaryText, fontSize: 14, marginTop: 24 },
  });
