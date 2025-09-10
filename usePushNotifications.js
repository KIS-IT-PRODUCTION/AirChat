import { useEffect, useRef } from 'react';
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

// ✨ 1. Створюємо універсальну функцію для навігації
// Вона буде викликатися і при натисканні, і при холодному старті.
const handleChatNavigation = (navigationRef, data) => {
  // Перевіряємо, чи навігація готова і чи є в сповіщенні дані для чату (roomId)
  if (navigationRef.current?.isReady() && data?.roomId) {
    console.log('Navigating to chat with data:', data);
    navigationRef.current.navigate('UserAppFlow', {
      screen: 'IndividualChat',
      params: { // Передаємо всі параметри, які відправила функція Supabase
        roomId: data.roomId,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        recipientAvatar: data.recipientAvatar,
        recipientLastSeen: data.recipientLastSeen,
      },
    });
  } else if (!navigationRef.current?.isReady()) {
    // Якщо навігація ще не готова, чекаємо трохи і пробуємо знову
    setTimeout(() => handleChatNavigation(navigationRef, data), 150);
  }
};


// ✨ 2. Змінюємо хук, щоб він приймав `navigationRef` з App.js
export const usePushNotifications = (navigationRef) => {
  const { session, profile } = useAuth();
  const { fetchUnreadCount } = useUnreadCount();
  const { fetchNewOffersCount } = useNewOffers();
  const { fetchNewTripsCount } = useNewTrips();

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
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH_NOTIF] Отримано сповіщення, поки додаток відкритий. Оновлюємо лічильники...');
        const type = notification.request.content.data?.type;
        if (fetchUnreadCount) {
          fetchUnreadCount();
        }
        if (type === 'new_offer' && profile.role === 'passenger' && fetchNewOffersCount) {
          fetchNewOffersCount();
        }
        if (type === 'offer_accepted' && profile.role === 'driver' && fetchNewTripsCount) {
          fetchNewTripsCount();
        }
      });

      // ✨ 3. Додаємо логіку в слухач натискань
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Користувач натиснув на сповіщення:', response);
        const notificationData = response.notification.request.content.data;
        // Викликаємо нашу нову функцію навігації
        handleChatNavigation(navigationRef, notificationData);
      });
      
      // ✨ 4. Перевіряємо, чи додаток відкрився через сповіщення (холодний старт)
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
    // ✨ 5. Додаємо `navigationRef` у масив залежностей
  }, [session, profile, fetchUnreadCount, fetchNewOffersCount, fetchNewTripsCount, navigationRef]);

  // Цей хук тепер не повертає токен, бо він не використовується в UI, 
  // але ви можете повернути його, якщо він вам потрібен деінде.
  return {};
};