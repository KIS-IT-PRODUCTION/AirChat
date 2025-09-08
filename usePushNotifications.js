import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './config/supabase';
import { useAuth } from './provider/AuthContext';

// Імпортуємо всі три контексти, щоб запускати їхні функції оновлення
import { useUnreadCount } from './provider/Unread Count Context';
import { useNewOffers } from './provider/NewOffersContext';
import { useNewTrips } from './provider/NewTripsContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const usePushNotifications = () => {
  const { session, profile } = useAuth(); // Отримуємо профіль, щоб знати роль користувача
  
  // Отримуємо функції оновлення з усіх контекстів
  const { fetchUnreadCount } = useUnreadCount();
  const { fetchNewOffersCount } = useNewOffers();
  const { fetchNewTripsCount } = useNewTrips();

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
        // Ваш projectId з Expo
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
    if (session?.user?.id && profile) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id);
        }
      });

      // Цей слухач обробляє сповіщення, які приходять, коли додаток відкритий
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH_NOTIF] Отримано сповіщення, поки додаток відкритий. Оновлюємо лічильники...');
        
        const type = notification.request.content.data?.type;

        // Універсальне оновлення для повідомлень чату
        if (fetchUnreadCount) {
          fetchUnreadCount();
        }

        // Оновлюємо лічильник пропозицій, якщо користувач - пасажир і тип сповіщення - 'new_offer'
        if (type === 'new_offer' && profile.role === 'passenger' && fetchNewOffersCount) {
          console.log('[PUSH_NOTIF] Запускаємо fetchNewOffersCount для пасажира...');
          fetchNewOffersCount();
        }
        
        // Оновлюємо лічильник поїздок, якщо користувач - водій і тип сповіщення - 'offer_accepted'
        if (type === 'offer_accepted' && profile.role === 'driver' && fetchNewTripsCount) {
          console.log('[PUSH_NOTIF] Запускаємо fetchNewTripsCount для водія...');
          fetchNewTripsCount();
        }
      });

      // Цей слухач обробляє натискання на сповіщення
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Користувач натиснув на сповіщення:', response);
        // Тут можна додати логіку для навігації на конкретний екран
      });

      // Функція очищення для видалення слухачів
      return () => {
        if(notificationListener.current) {
            Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if(responseListener.current) {
            Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [session, profile, fetchUnreadCount, fetchNewOffersCount, fetchNewTripsCount]);

  return { expoPushToken };
};