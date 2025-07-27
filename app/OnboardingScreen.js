import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Swiper from 'react-native-swiper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../app/ThemeContext'; // 1. Імпортуємо useTheme

// Компонент слайду тепер теж приймає кольори
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
  // 2. Отримуємо кольори та генеруємо стилі
  const { colors } = useTheme();
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
      >
        <Slide
          icon="airplane-outline"
          title="Ласкаво просимо!"
          text="Наш додаток допоможе вам легко замовити трансфер."
          colors={colors}
        />
        <Slide
          icon="options-outline"
          title="Налаштуйте поїздку"
          text="Оберіть дату, час, кількість пасажирів та багажу."
          colors={colors}
        />
       
        <View style={styles.slide}>
            <Ionicons name="checkmark-done-circle-outline" size={100} color={colors.primary} />
            <Text style={styles.title}>Все готово!</Text>
            <Text style={styles.text}>Натисніть кнопку нижче, щоб почати.</Text>
            <TouchableOpacity style={styles.doneButton} onPress={onDone}>
                <Text style={styles.doneButtonText}>Почати</Text>
            </TouchableOpacity>
        </View>
      </Swiper>
    </SafeAreaView>
  );
}

// 3. Перетворюємо стилі на динамічну функцію
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Динамічний колір
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background, // Динамічний колір
  },
  title: {
    color: colors.text, // Динамічний колір
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  text: {
    color: colors.secondaryText, // Динамічний колір
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  dot: {
    backgroundColor: 'rgba(174, 174, 178, 0.5)', // Можна залишити або теж зробити динамічним
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
  activeDot: {
    backgroundColor: colors.primary, // Динамічний колір
    width: 16,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
  },
  doneButton: {
    backgroundColor: colors.primary, // Динамічний колір
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 40,
  },
  doneButtonText: {
    color: '#FFFFFF', // Зазвичай текст на кнопці залишається білим
    fontSize: 18,
    fontWeight: 'bold',
  }
});