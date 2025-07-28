import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';


// (You can reuse the InputWithIcon component from RegistrationScreen if you export it)
const InputWithIcon = ({ icon, placeholder, value, onChangeText, secureTextEntry = false }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  );
};

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.fillAllFields'));
      return;
    }
    setLoading(true);
    const { error } = await signIn({ email, password });
    if (error) {
      Alert.alert(t('common.error'), error.message);
    }
    // The onAuthStateChange listener in AuthContext will handle navigation
    setLoading(false);
  };
  
  // Placeholder function for forgot password
  const handleForgotPassword = () => {
    // You would navigate to a Forgot Password screen here
    // For example: navigation.navigate('ForgotPassword');
    Alert.alert(t('login.forgotPassword'), t('login.featureComingSoon'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('login.title', { defaultValue: 'Login' })}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle', { defaultValue: 'Welcome back!' })}</Text>
        </View>
        <View style={styles.form}>
          <InputWithIcon
            icon="mail-outline"
            placeholder={t('registration.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
          />
          <InputWithIcon
            icon="lock-closed-outline"
            placeholder={t('registration.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>{t('login.forgotPassword', { defaultValue: 'Forgot Password?' })}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('common.loading', { defaultValue: 'Loading...'}) : t('auth.login')}</Text>
          </TouchableOpacity>
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t('login.noAccount', { defaultValue: "Don't have an account?" })} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RegistrationScreen')}>
              <Text style={styles.signupLink}>{t('auth.register', { defaultValue: 'Sign Up' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  subtitle: { color: colors.secondaryText, fontSize: 16, marginTop: 8 },
  form: { width: '100%', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, marginBottom: 20, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.text, fontSize: 16, height: 50 },
  forgotPasswordText: {
    color: colors.primary,
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 20,
  },
  footer: { width: '100%', alignItems: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
