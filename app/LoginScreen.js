// app/screens/LoginScreen.js
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
    setLoading(true);
    const { error } = await signIn({ email, password });
    if (error) {
      Alert.alert(t('common.error'), error.message);
    }
    // The onAuthStateChange listener in AuthContext will handle navigation
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('login.title', { defaultValue: 'Login' })}</Text>
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
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? t('common.loading', { defaultValue: 'Loading...'}) : t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// You can create a shared styles file or copy the styles from RegistrationScreen
const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: colors.text, fontSize: 32, fontWeight: 'bold' },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, marginBottom: 20, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: colors.text, fontSize: 16, height: 50 },
  footer: { width: '100%', alignItems: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});