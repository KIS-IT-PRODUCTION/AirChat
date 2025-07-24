import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n'; // Імпортуємо нашу конфігурацію
import * as Localization from 'expo-localization';

export const LocalizationContext = createContext();

export const LocalizationProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(Localization.getLocales()[0]?.languageCode);

  const setLocale = async (newLocale) => {
    try {
      // Зберігаємо вибір користувача
      await AsyncStorage.setItem('user-locale', newLocale);
      // Оновлюємо стан у i18n та в React
      i18n.locale = newLocale;
      setLocaleState(newLocale);
    } catch (e) {
      console.error('Failed to save locale.', e);
    }
  };

  // При запуску перевіряємо, чи є збережена мова
  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem('user-locale');
        if (savedLocale) {
          i18n.locale = savedLocale;
          setLocaleState(savedLocale);
        }
      } catch (e) {
        console.error('Failed to load locale.', e);
      }
    };
    loadLocale();
  }, []);
  
  // Надаємо функцію перекладу 't' та функцію зміни мови
  return (
    <LocalizationContext.Provider value={{ setLocale, locale, t: i18n.t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Кастомний хук для легкого доступу
export const useLocale = () => useContext(LocalizationContext);