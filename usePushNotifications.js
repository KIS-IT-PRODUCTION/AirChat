import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './config/supabase';
import { useAuth } from './provider/AuthContext';
// ✨ 1. Імпортуємо хук нашого нового контексту
import { useUnreadCount } from './provider/Unread Count Context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const { session } = useAuth();
  // ✨ 2. Отримуємо функцію для оновлення лічильника з контексту
  const { fetchUnreadCount } = useUnreadCount(); 
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      token = (await Notifications.getExpoPushTokenAsync({
        // Ваш projectId
        projectId: 'e5ae05a0-322d-4a51-84d9-84738230258b',
      })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    return token;
  };

  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id);
        }
      });

      // ✨ 3. ОНОВЛЕНА ЛОГІКА СЛУХАЧА
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH_NOTIF] Отримано сповіщення, поки додаток відкритий.');
        // Коли приходить нове сповіщення, ми просто просимо наш
        // глобальний контекст оновити лічильник.
        if (fetchUnreadCount) {
          console.log('[PUSH_NOTIF] Виклик fetchUnreadCount з контексту...');
          fetchUnreadCount();
        }
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(response);
        // Тут можна додати логіку переходу на екран чату при натисканні на сповіщення
      });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
      };
    }
  }, [session, fetchUnreadCount]); // ✨ Додаємо fetchUnreadCount у залежності

  return { expoPushToken };
};
