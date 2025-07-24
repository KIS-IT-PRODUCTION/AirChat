import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Створюємо контекст
export const AuthContext = createContext();

// Компонент-провайдер
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);

  // Функція "входу"
  const login = async () => {
    // У реальному додатку тут буде запит до сервера
    const fakeToken = 'dummy-auth-token';
    setUserToken(fakeToken);
    await AsyncStorage.setItem('userToken', fakeToken);
  };

  // Функція "виходу"
  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem('userToken');
  };

  // Перевірка при запуску, чи є збережений токен
  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      setUserToken(token);
      setIsLoading(false);
    } catch (e) {
      console.error('Failed to fetch user token', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, isLoading, isAuthenticated: !!userToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// Кастомний хук для легкого доступу
export const useAuth = () => useContext(AuthContext);