import React, { createContext, useState, useContext } from 'react';
import { useColorScheme } from 'react-native';

// 1. Визначаємо палітри кольорів для обох тем
const lightColors = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#007AFF',
  card: '#F2F2F7',
};

const darkColors = {
  background: '#000000',
  text: '#FFFFFF',
  primary: '#0A84FF',
  card: '#1C1C1E',
};

// 2. Створюємо контекст, який буде зберігати дані про тему
export const ThemeContext = createContext();

// 3. Створюємо "провайдер" - компонент, який буде огортати наш додаток
export const ThemeProvider = ({ children }) => {
  // Визначаємо системну тему за допомогою хука
  const systemTheme = useColorScheme();
  
  // Стан для зберігання поточної теми ('light' або 'dark')
  // Початкове значення беремо з налаштувань системи
  const [theme, setTheme] = useState(systemTheme || 'light');

  // Функція для перемикання теми вручну
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Вибираємо відповідну палітру кольорів залежно від поточної теми
  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Створюємо кастомний хук для зручного доступу до контексту в компонентах
export const useTheme = () => useContext(ThemeContext);