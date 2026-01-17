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

let isNavigating = false;

const handleChatNavigation = (navigationRef, data) => {
  if (isNavigating) {
    console.log('[PUSH_NAV] Навігація вже в процесі, пропускаємо.');
    return;
  }

  if (navigationRef.current?.isReady() && data?.roomId) {
    console.log('[PUSH_NAV] Навігація готова. Перехід до IndividualChat:', data.roomId);
    isNavigating = true;
    
    navigationRef.current.navigate('IndividualChat', {
      roomId: data.roomId,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientAvatar: data.recipientAvatar,
      recipientLastSeen: data.recipientLastSeen,
    });
    
    setTimeout(() => { 
      isNavigating = false; 
      console.log('[PUSH_NAV] Прапорець навігації скинуто.');
    }, 1500); 

  } else if (!navigationRef.current?.isReady()) {
    console.log('[PUSH_NAV] Навігація не готова, повторна спроба через 200мс...');
    setTimeout(() => handleChatNavigation(navigationRef, data), 200);
  } else {
    console.warn('[PUSH_NAV] Не вдалося перейти: відсутній roomId або ref.', data);
  }
};

export const usePushNotifications = (navigationRef) => {
  const { session, profile } = useAuth();
  const { fetchUnreadCount } = useUnreadCount();
  const { fetchNewOffersCount } = useNewOffers();
  const { fetchNewTripsCount } = useNewTrips();

  const notificationListener = useRef();
  const responseListener = useRef();

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
    if (session?.user?.id && profile && navigationRef) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          console.log('[PUSH_TOKEN] Отримано токен, оновлюємо профіль:', token.substring(0, 20) + '...');
          await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id);
        } else {
             console.warn('[PUSH_TOKEN] Не вдалося отримати токен. Очищуємо старий токен в БД.');
             await supabase
                .from('profiles')
                .update({ expo_push_token: null })
                .eq('id', session.user.id);
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('[PUSH_FG] Отримано сповіщення у відкритому додатку. Оновлюємо лічильники...');
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
        console.log('[PUSH_TAP] Користувач натиснув на сповіщення.');
        const notificationData = response.notification.request.content.data;
        handleChatNavigation(navigationRef, notificationData);
      });
      
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response) {
            console.log('[PUSH_COLD_START] Додаток відкрито натисканням на сповіщення.');
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