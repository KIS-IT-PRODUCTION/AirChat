import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Logo from '../assets/icon.svg';
import { useTheme } from './ThemeContext';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo width={100} height={100} style={{marginBottom: 24}} />
        <Text style={styles.title}>{t('authScreen.title', { defaultValue: 'AirChat: Transfers to and from the airport' })}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('RegistrationScreen', { role: 'client' })}>
          <Text style={styles.buttonText}>{t('auth.register')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={[styles.buttonText, { color: colors.text }]}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('RegistrationScreen', { role: 'driver' })}>
          <Text style={styles.driverLink}>{t('authScreen.driverLogin', { defaultValue: 'Are you a driver? Register here' })}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  title: { color: colors.text, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  buttonsContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  driverLink: { color: colors.secondaryText, fontSize: 14, textAlign: 'center', marginTop: 8, textDecorationLine: 'underline' },
});