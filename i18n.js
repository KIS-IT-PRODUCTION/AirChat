import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage) {
      return callback(savedLanguage);
    }
    const deviceLocale = Localization.getLocales()[0]?.languageCode;
    return callback(resources[deviceLocale] ? deviceLocale : "uk");
  },
  init: () => {},
  cacheUserLanguage: async (lng) => {
    await AsyncStorage.setItem('user-language', lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "uk",
    compatibilityJSON: "v3",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;