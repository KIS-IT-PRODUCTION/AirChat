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
  Linking,
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

const BANNED_WORDS = [
  'admin', 'moderator', 'administrator', 'адмін', 'модератор', 'airchat',

  'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'faggot', 'asshole', 'dick', 
  'pussy', 'bastard', 'damn', 'hell', 'cocksucker',

  'хуй', 'хуя', 'хуе', 'хуи', 'хую', 'хуё',
  'пизда', 'пізда', 'пизди', 'пізди', 'пиздец', 'піздєц',
  'блять', 'блядь', 'блят',
  'сука', 'суки', 'суче',
  'їбати', 'ебать', 'їбу', 'ебу', 'ебал', 'їбав', 'еблан', 'долбоеб', 'долбоёб',
  'йобаний', 'ебаный',
  'гівно', 'говно', 'гавно',
  'курва', 'курви',
  'чорт', 'черт',
  'мразь',
  'уебок', 'уёбок',
  'шлюха',
  'дрочить', 'дрочу',
  'пидор', 'підор', 'пидарас',
  'мудак',

  'hui', 'huy', 'huj',
  'pizda', 'pisda',
  'blyat', 'blyad',
  'suka',
  'ebat', 'jebat', 'ibat',
  'govno', 'hivno', 'givno',
  'kurva',
  'pidor', 'pidar',
  'mudak'
]; 

const containsBannedWords = (text) => {
  if (!text) return false;
  
  const textToCompare = text.toLowerCase().replace(/[\s\-_.,!?*@0-9]/g, '');

  for (const word of BANNED_WORDS) {
    if (textToCompare.includes(word)) {
      return true;
    }
  }
  return false;
};


const TERMS_URL = "https://air-chat.github.io/airchat/#/terms";
const PRIVACY_URL = "https://air-chat.github.io/airchat/#/privacy"; 

const InputWithIcon = ({ icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, secureTextEntry, onToggleVisibility, isPassword, containerStyle }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors, {});

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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);


  const [agreedToTerms, setAgreedToTerms] = useState(false);

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

    if (containsBannedWords(fullName.trim())) {
      setErrorText(t('registration.bannedName', "Це ім'я містить неприпустимі слова."));
      return;
    }

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

    if (!agreedToTerms) {
      setErrorText(t('registration.mustAgreeToTerms', 'Ви повинні погодитись з Умовами Користування.'));
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
  const togglePasswordVisibility = useCallback(() => setIsPasswordVisible(prev => !prev), []);
  
  const toggleAgreedToTerms = () => {
    setAgreedToTerms(!agreedToTerms);
    clearError();
  };

  const handleOpenURL = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(t('common.error', 'Помилка'), t('registration.cannotOpenLink', 'Не вдалося відкрити посилання.'));
    }
  };

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
            
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={toggleAgreedToTerms}
              >
                <Ionicons 
                  name={agreedToTerms ? 'checkbox' : 'square-outline'}
                  size={24} 
                  color={agreedToTerms ? colors.primary : colors.secondaryText} 
                />
              </TouchableOpacity>
              <Text style={styles.termsText} onMoveShouldSetResponder={() => true}>
                {t('registration.iAgree', 'Я погоджуюсь з ')}
                <Text 
                  style={styles.termsLink} 
                  onPress={() => handleOpenURL(TERMS_URL)} 
                >
                  {t('registration.termsLink', 'Умовами Користування')}
                </Text>
                {t('registration.and', ' та ')}
                <Text 
                  style={styles.termsLink} 
                  onPress={() => handleOpenURL(PRIVACY_URL)} 
                >
                  {t('registration.privacyLink', 'Політикою Конфіденційності')}
                </Text>
                <Text style={styles.termsText}>.</Text>
              </Text>
            </View>
            
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <View style={styles.footer}>
              <TouchableOpacity 
                style={[
                  styles.registerButton, 
                  (!agreedToTerms || loading || isCheckingEmail) && styles.disabledButton
                ]} 
                onPress={handleRegister} 
                disabled={!agreedToTerms || loading || isCheckingEmail}
              >
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
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    checkbox: {
        marginRight: 10,
        padding: 5,
    },
    termsText: {
        color: colors.secondaryText,
        fontSize: 14,
        flex: 1,
    },
    termsLink: {
        color: colors.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    //
    errorText: { color: '#D32F2F', textAlign: 'center', marginBottom: 20, fontSize: 14, fontWeight: '500' },
    footer: { alignItems: 'center', marginTop: 20 },
    registerButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
    disabledButton: {
      backgroundColor: colors.border,
    },
    registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    loginLink: { color: colors.secondaryText, fontSize: 14, marginTop: 24 },
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