import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Swiper from 'react-native-swiper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../app/ThemeContext';
import { useTranslation } from 'react-i18next';

// Компонент слайду
const Slide = ({ icon, title, text, colors }) => {
  const styles = getStyles(colors);
  return (
    <View style={styles.slide}>
      <Ionicons name={icon} size={100} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};


export default function OnboardingScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  const onDone = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      navigation.replace('HomeScreen');
    } catch (e) {
      console.error('Failed to save onboarding status', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Swiper
        style={styles.wrapper}
        loop={false}
        dot={<View style={styles.dot} />}
        activeDot={<View style={styles.activeDot} />}
        showsButtons={false} 
      >
        <Slide
          icon="airplane-outline"
          title={t('onboarding.welcomeTitle')}
          text={t('onboarding.welcomeText')}
          colors={colors}
        />
        <Slide
          icon="options-outline"
          title={t('onboarding.configureTitle')}
          text={t('onboarding.configureText')}
          colors={colors}
        />
        <View style={styles.slide}>
            <Ionicons name="checkmark-done-circle-outline" size={100} color={colors.primary} />
            <Text style={styles.title}>{t('onboarding.readyTitle')}</Text>
            <Text style={styles.text}>{t('onboarding.readyText')}</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onDone}>
                <Text style={styles.doneButtonText}>{t('onboarding.startButton')}</Text>
            </TouchableOpacity>
        </View>
      </Swiper>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  text: {
    color: colors.secondaryText,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  dot: {
    backgroundColor: 'rgba(174, 174, 178, 0.5)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 16,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 40,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
