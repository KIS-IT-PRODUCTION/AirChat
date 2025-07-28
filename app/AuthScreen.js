import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Logo from '../assets/icon.svg'; // Імпортуємо векторний логотип

// 1. ВИПРАВЛЕНО: Всі хуки імпортуються з єдиної папки 'app/context/'
import { useTheme } from './ThemeContext';

export default function AuthScreen() {
  // --- Отримуємо дані з контекстів ---
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();

  // Генеруємо стилі на основі теми
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
                   <Logo width={100} height={100} style={{marginBottom: 24}} />
       
        <Text style={styles.title}>{t('authScreen.title', { defaultValue: 'AirChat: Transfers to and from the airport' })}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {/* 2. ВИПРАВЛЕНО: Кнопка тепер веде на екран реєстрації */}
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('RegistrationScreen')}>
          <Text style={styles.buttonText}>{t('auth.register')}</Text>
        </TouchableOpacity>
        
        {/* 3. ВИПРАВЛЕНО: Кнопка тепер веде на екран входу */}
        <TouchableOpacity style={[styles.primaryButton, styles.secondaryButton]} onPress={() => navigation.navigate('LoginScreen')}>
          <Text style={[styles.buttonText, { color: colors.text }]}>{t('auth.login')}</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.driverLink}>{t('authScreen.driverLogin', { defaultValue: 'Are you a driver? Login to your cabinet' })}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverLink: {
    color: colors.secondaryText,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});