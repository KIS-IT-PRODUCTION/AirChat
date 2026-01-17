import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightColors = {
  background: '#F0F0F7',
  text: '#1C1C1E',
  primary: '#007AFF',
  card: '#FFFFFF',
  secondaryText: '#8A8A8E',
  border: '#E5E5EA',
};

const darkColors = {
  background: '#000000',
  text: '#FFFFFF',
  primary: '#0A84FF',
  card: '#1C1C1E',
  secondaryText: '#8D8D93',
  border: '#38383A',
};

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState(systemTheme || 'light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.error('Failed to load theme from storage.', e);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('user-theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to storage.', e);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);