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

// ✨ 1. КЛЮЧОВЕ ВИПРАВЛЕННЯ: Спрощена та надійна функція навігації
const handleChatNavigation = (navigationRef, data) => {
  if (navigationRef.current?.isReady() && data?.roomId) {
    console.log('Navigating directly to IndividualChat with data:', data);
    
    // Замість того, щоб вказувати 'UserAppFlow', ми переходимо напряму на 'IndividualChat'.
    // React Navigation сам знайде цей екран у поточному активному стеку (водія чи пасажира).
    navigationRef.current.navigate('IndividualChat', {
      roomId: data.roomId,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientAvatar: data.recipientAvatar,
      recipientLastSeen: data.recipientLastSeen,
    });
  } else if (!navigationRef.current?.isReady()) {
    // Якщо навігація ще не готова (холодний старт), чекаємо і пробуємо знову.
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
        if (type === 'new_offer' && profile.role === 'client' && fetchNewOffersCount) { // У пасажира роль 'client'
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
  }, [session, profile, fetchUnreadCount, fetchNewOffersCount, fetchNewTripsCount, navigationRef]);

  return {};
};
