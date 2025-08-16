// app/hooks/usePushNotifications.js
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './config/supabase';
import { useAuth } from './provider/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // Дозволяє сповіщенню змінювати лічильник
  }),
});

export const usePushNotifications = () => {
  const { session } = useAuth();
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

      // ✨ ОНОВЛЕНА ЛОГІКА ✨
      notificationListener.current = Notifications.addNotificationReceivedListener(async notification => {
        // Коли приходить нове сповіщення, ми запитуємо у бази даних
        // актуальну загальну кількість непрочитаних повідомлень.
        const { data, error } = await supabase.rpc('get_total_unread_count');
        if (!error && data) {
          // І встановлюємо цю кількість на іконку додатку.
          Notifications.setBadgeCountAsync(data);
        }
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(response);
      });

      return () => {
        Notifications.removeNotificationSubscription(notificationListener.current);
        Notifications.removeNotificationSubscription(responseListener.current);
      };
    }
  }, [session]);

  return { expoPushToken };
};
