// usePushNotifications.js (ОНОВЛЕНО)

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './config/supabase';
import { useAuth } from './provider/AuthContext';
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

// ✨ 1. КЛЮЧОВЕ ВИПРАВЛЕННЯ: Спрощена та надійна функція навігації (винесена для чистоти)
const handleChatNavigation = (navigationRef, data) => {
  if (navigationRef.current?.isReady() && data?.roomId) {
    console.log('Navigating directly to IndividualChat with data:', data);
    
    navigationRef.current.navigate('IndividualChat', {
      roomId: data.roomId,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientAvatar: data.recipientAvatar,
      recipientLastSeen: data.recipientLastSeen,
    });
  } else if (!navigationRef.current?.isReady()) {
    setTimeout(() => handleChatNavigation(navigationRef, data), 200);
  }
};


export const usePushNotifications = (navigationRef) => {
  const { session, profile } = useAuth();
  const { fetchUnreadCount } = useUnreadCount();
  const { fetchNewOffersCount } = useNewOffers();
  const { fetchNewTripsCount } = useNewTrips();

  const notificationListener = useRef();
  const responseListener = useRef();

  // 💡 ОНОВЛЕНО: Видалення проблемного projectId
  const registerForPushNotificationsAsync = useCallback(async () => {
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
      
      // 💡 КРИТИЧНЕ ВИПРАВЛЕННЯ: Видаляємо projectId. 
      // Дозволяємо Expo автоматично визначити ID з конфігурації EAS Build.
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({}); 
        token = tokenResponse.data;
      } catch (e) {
        console.error("Error fetching Expo Push Token:", e);
        return;
      }

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
  }, []);

  useEffect(() => {
    if (session?.user?.id && profile) {
      // 💡 ОНОВЛЕНО: Обов'язково чистимо старий токен, якщо реєстрація була успішною, але токен не отримано
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id);
        } else {
             // 💡 ДОДАТКОВА НАДІЙНІСТЬ: Якщо токен не отримано (через помилку), чистимо старий токен в БД.
             await supabase
                .from('profiles')
                .update({ expo_push_token: null })
                .eq('id', session.user.id);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH_NOTIF] Отримано сповіщення, поки додаток відкритий. Оновлюємо лічильники...');
        const type = notification.request.content.data?.type;
        if (fetchUnreadCount) {
          fetchUnreadCount();
        }
        if (type === 'new_offer' && profile.role === 'client' && fetchNewOffersCount) { 
          fetchNewOffersCount();
        }
        if (type === 'offer_accepted' && profile.role === 'driver' && fetchNewTripsCount) {
          fetchNewTripsCount();
        }
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Користувач натиснув на сповіщення:', response);
        const notificationData = response.notification.request.content.data;
        handleChatNavigation(navigationRef, notificationData);
      });
      
      // 💡 ПЕРЕВІРКА ХОЛОДНОГО СТАРТУ: Виконується один раз при завантаженні застосунку
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response) {
            console.log('Додаток відкрито з холодного старту через сповіщення');
            const notificationData = response.notification.request.content.data;
            handleChatNavigation(navigationRef, notificationData);
        }
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    }
  }, [session, profile, fetchUnreadCount, fetchNewOffersCount, fetchNewTripsCount, navigationRef, registerForPushNotificationsAsync]);

  return {};
};