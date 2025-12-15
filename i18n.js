// app/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Імпортуємо файли перекладів
import en from "./locale/en.json";
import uk from "./locale/uk.json";
import ro from "./locale/ro.json";

const resources = {
  en: { translation: en },
  uk: { translation: uk },
  ro: { translation: ro },
};

const languageDetector = {
  type: "languageDetector",
  async: true,
  detect: async (callback) => {
    // Спочатку шукаємо збережену мову
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage) {
      return callback(savedLanguage);
    }
    // Якщо не знайдено, визначаємо мову пристрою
    const deviceLocale = Localization.getLocales()[0]?.languageCode;
    // Повертаємо мову пристрою, якщо вона підтримується, інакше 'uk'
    return callback(resources[deviceLocale] ? deviceLocale : "uk");
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    // Зберігаємо вибір користувача
    await AsyncStorage.setItem('user-language', lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "uk", // Мова за замовчуванням, якщо інше не знайдено
    compatibilityJSON: "v3", // Важливо для React Native
    interpolation: {
      escapeValue: false, // React вже захищає від XSS
    },
  });

export default i18n;