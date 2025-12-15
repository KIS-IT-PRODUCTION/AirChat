import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Define richer color palettes for both themes
const lightColors = {
  background: '#F0F0F7', // A slightly off-white for a softer look
  text: '#1C1C1E',       // Almost black for strong contrast
  primary: '#007AFF',     // Standard iOS blue
  card: '#FFFFFF',         // Pure white for cards to stand out
  secondaryText: '#8A8A8E', // Gray for labels and less important text
  border: '#E5E5EA',       // Light gray for dividers
};

const darkColors = {
  background: '#000000',     // Pure black for a true dark mode
  text: '#FFFFFF',         // Pure white for strong contrast
  primary: '#0A84FF',     // A slightly brighter blue for dark mode
  card: '#1C1C1E',         // Dark gray for cards
  secondaryText: '#8D8D93', // Lighter gray for dark mode
  border: '#38383A',       // Subtle border color for dark mode
};

// 2. Create the context
export const ThemeContext = createContext();

// 3. Create the provider component
export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState(systemTheme || 'light');

  // Load the saved theme from storage when the app starts
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

  // Function to toggle and save the theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('user-theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme to storage.', e);
    }
  };

  // Select the appropriate color palette
  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Custom hook for easy access
export const useTheme = () => useContext(ThemeContext);