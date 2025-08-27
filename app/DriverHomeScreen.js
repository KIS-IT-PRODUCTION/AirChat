import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Platform } from 'react-native';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import Logo from '../assets/icon.svg';

const TransferRequestCard = ({ item, onPress }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme, t);

    const isAccepted = item.status === 'accepted';

    const getShortName = (name) => {
        if (!name) return '';
        const parts = name.split(' ');
        return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : name;
    };

    const getResizedAvatarUrl = (url) => {
        if (!url) return null;
        let transformedUrl = url.replace('/object/', '/render/image/');
        const resizeParams = 'width=128&height=128&resize=cover';
        return transformedUrl.includes('?') ? `${transformedUrl}&${resizeParams}` : `${transformedUrl}?${resizeParams}`;
    };

    const avatarSource = item.passenger_avatar_url 
        ? { uri: getResizedAvatarUrl(item.passenger_avatar_url) } 
        : require('../assets/default-avatar.png');

    return (
        <TouchableOpacity style={[styles.card, isAccepted && styles.acceptedCard]} onPress={onPress} disabled={isAccepted}>
            <View style={styles.cardTop}>
                <Image source={avatarSource} style={styles.avatar} />
                <View style={styles.infoContainer}>
                    <Text style={styles.passengerName} numberOfLines={1}>{getShortName(item.passenger_name)}</Text>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="calendar-outline" size={14} /> {t('driverHome.date')}</Text>
                            <Text style={styles.detailValue}>{moment(item.transfer_datetime).format('DD MMMM')}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="time-outline" size={14} /> {t('driverHome.time')}</Text>
                            <Text style={styles.detailValue}>{moment(item.transfer_datetime).format('HH:mm')}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="people-outline" size={14} /> {t('driverHome.people')}</Text>
                            <Text style={styles.detailValue}>{item.total_passengers}</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.dividerContainer}>
                <View style={styles.dividerDot} />
                <View style={[styles.dividerLine, { borderColor: colors.border }]} />
                <View style={styles.dividerDot} />
            </View>
            <View style={styles.routeContainer}>
                <View style={styles.locationRow}>
                    <View style={[styles.routeCircle, styles.startCircle, { borderColor: colors.secondaryText }]} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text>
                </View>
                <View style={[styles.routeDottedLine, { borderColor: colors.secondaryText }]} />
                <View style={styles.locationRow}>
                    <View style={[styles.routeCircle, styles.endCircle, { backgroundColor: colors.secondaryText }]} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function DriverHomeScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const styles = getStyles(colors, theme, t);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);

  const fetchNewRequestsCount = useCallback(async () => {
    try {
        const { data, error } = await supabase.rpc('get_new_transfers_count');
        if (error) throw error;
        setNewRequestsCount(data);
    } catch (error) {
        console.error("Error fetching new requests count:", error.message);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
        const { data, error } = await supabase.rpc('get_driver_feed_transfers');
        if (error) throw error;
        setRequests(data);
    } catch (error) {
        console.error("Error fetching transfer requests:", error.message);
    }
  }, []);

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await Promise.all([fetchRequests(), fetchNewRequestsCount()]);
      setRefreshing(false);
  }, [fetchRequests, fetchNewRequestsCount]);

  useFocusEffect(useCallback(() => {
    // Не показуємо повноекранне завантаження при поверненні на екран
    // setLoading(true); 
    Promise.all([fetchRequests(), fetchNewRequestsCount()]).finally(() => setLoading(false));
  }, [fetchRequests, fetchNewRequestsCount]));

  useEffect(() => {
    const channel = supabase
      .channel('public:transfers:driver_home')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfers' },
        (payload) => {
          fetchNewRequestsCount(); 
          // Оптимістично додаємо нову заявку вгору списку
          setRequests(prev => [payload.new, ...prev]); 
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNewRequestsCount]);

  const handleCardPress = (item) => {
    // Позначаємо як прочитану (у фоновому режимі)
    supabase.rpc('mark_transfer_as_viewed', { p_transfer_id: item.id }).then(({ error }) => {
        if (error) console.error("Error marking as viewed:", error.message);
    });
    // Переходимо на екран деталей
    navigation.navigate('DriverRequest', { transferId: item.id });
  };
  
  if (loading && !refreshing) {
      return (
          <SafeAreaView style={styles.container}>
              <View style={styles.header}><Text style={styles.title}>{t('driverHome.title', 'Доступні заявки')}</Text><Logo width={40} height={40} /></View>
              <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('driverHome.title')}</Text>
        <Logo width={40} height={40} />
      </View>

      <View style={[styles.statusBanner, newRequestsCount > 0 ? styles.newRequestBanner : styles.noNewRequestBanner]}>
          <Ionicons 
              name={newRequestsCount > 0 ? "notifications-circle" : "checkmark-done-circle-outline"} 
              size={24} 
              color={newRequestsCount > 0 ? colors.primary : '#28a745'}
          />
          <Text style={styles.statusText}>
              {newRequestsCount > 0 
                  ? t('driverHome.newRequests', { count: newRequestsCount })
                  : t('driverHome.noNewRequests')
              }
          </Text>
      </View>

      <FlatList
        data={requests}
        renderItem={({ item }) => (
            <TransferRequestCard 
                item={item} 
                onPress={() => handleCardPress(item)}
            />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        ListEmptyComponent={<View style={styles.content}><Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} /><Text style={styles.text}>{t('driverHome.noRequests')}</Text></View>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors, theme, t) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
    text: { fontSize: 18, color: colors.secondaryText, textAlign: 'center', marginTop: 16 },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    newRequestBanner: {
        backgroundColor: `${colors.primary}20`,
        borderColor: colors.primary,
    },
    noNewRequestBanner: {
        backgroundColor: '#28a74520',
        borderColor: '#28a745',
    },
    statusText: {
        marginLeft: 10,
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'light' ? 0.08 : 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    acceptedCard: { opacity: 0.5 },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: colors.background },
    infoContainer: { flex: 1 },
    passengerName: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { alignItems: 'center', flex: 1,  },
    detailLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 , justifyContent: 'center' },
    dividerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    routeContainer: { paddingLeft: 32 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: colors.text, fontSize: 16, marginLeft: 16, fontWeight: '500' },
    routeDottedLine: { height: 20, width: 1, borderLeftWidth: 1, borderStyle: 'dashed', marginLeft: 5, marginVertical: 4 },
    routeCircle: { width: 12, height: 12, borderRadius: 6 },
    startCircle: { backgroundColor: 'transparent', borderWidth: 2 },
    endCircle: {},
});