import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';

const validateEmail = (email) => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

// --- ЗМІНА: Компонент InputWithIcon тепер визначений тут з новим функціоналом ---
const InputWithIcon = ({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, secureTextEntry, onToggleVisibility, isPassword, containerStyle }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors, {}); // insets не потрібні для цього компонента

    return (
        <View style={[styles.inputWrapper, containerStyle]}>
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
            {isPassword && (
                <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
                    <Ionicons name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'} size={24} color={colors.secondaryText} />
                </TouchableOpacity>
            )}
        </View>
    );
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

  // --- ЗМІНА: Додано стан для видимості пароля ---
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState(true);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (!email.trim() || !validateEmail(email)) {
      setIsEmailAvailable(true);
      setErrorText('');
      return;
    }
    debounceTimeout.current = setTimeout(async () => {
      setIsCheckingEmail(true);
      setErrorText('');
      try {
        const { data, error } = await supabase.rpc('email_exists', {
          email_to_check: email.trim().toLowerCase()
        });
        if (error) throw error;
        setIsEmailAvailable(!data);
      } catch (error) {
        console.error("Error checking email via RPC:", error.message);
        setIsEmailAvailable(true);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);
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
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: role
        }
      }
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

  // --- ЗМІНА: Функція для перемикання видимості пароля ---
  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(prev => !prev);
  }, []);

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
              <View style={styles.emailValidationContainer}>
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
              {/* --- ЗМІНА: Оновлений компонент для пароля --- */}
              <InputWithIcon
                icon="lock-closed-outline"
                placeholder={t('registration.passwordPlaceholder', 'Пароль')}
                value={password}
                onChangeText={(text) => { setPassword(text); clearError(); }}
                secureTextEntry={!isPasswordVisible}
                isPassword={true}
                onToggleVisibility={togglePasswordVisibility}
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
    emailValidationContainer: { flexDirection: 'row', alignItems: 'center' },
    validationIndicator: {
        width: 40,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        right: 10,
        top: 0,
    },
    errorText: { color: '#D32F2F', textAlign: 'center', marginBottom: 20, fontSize: 14, fontWeight: '500' },
    footer: { alignItems: 'center', marginTop: 20 },
    registerButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
    registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    loginLink: { color: colors.secondaryText, fontSize: 14, marginTop: 24 },
    // --- ЗМІНА: Нові стилі для InputWithIcon ---
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        height: 50,
        color: colors.text,
        fontSize: 16,
    },
    eyeIcon: {
        padding: 5,
    },
  });