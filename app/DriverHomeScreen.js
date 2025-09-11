import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Switch, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import IndividualTransferIcon from '../assets/induvidual.svg'; 
import GroupTransferIcon from '../assets/group.svg';
import { useAuth } from '../provider/AuthContext';
import { MotiView } from 'moti';
// ✨ 1. Імпортуємо логотип
import Logo from '../assets/icon.svg';

const TransferRequestCard = memo(({ item, onPress, isExpiring }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);

    const getShortName = (name) => {
        if (!name) return '';
        const parts = name.split(' ');
        return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : name;
    };

    const avatarSource = item.passenger_avatar_url 
        ? { uri: item.passenger_avatar_url } 
        : require('../assets/default-avatar.png');

    const airportIcon = <Ionicons name="airplane-outline" size={24} color={colors.secondaryText} />;
    const locationIcon = <Ionicons name="business-outline" size={24} color={colors.secondaryText} />;
    const startIcon = item.direction === 'from_airport' ? airportIcon : locationIcon;
    const endIcon = item.direction === 'to_airport' ? airportIcon : locationIcon;
    
    const truncatedComment = item.passenger_comment && item.passenger_comment.length > 20
        ? `${item.passenger_comment.substring(0, 20)}...`
        : item.passenger_comment;

    return (
        <TouchableOpacity style={[styles.card, isExpiring && styles.expiringCard]} onPress={onPress}>
            <View style={styles.cardTop}>
                <Image 
                    source={avatarSource} 
                    style={styles.avatar}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
                />
                <View style={styles.infoContainer}>
                    <View style={styles.nameAndTypeContainer}>
                        <Text style={styles.passengerName} numberOfLines={1}>{getShortName(item.passenger_name)}</Text>
                        <View style={styles.transferIconContainer}>
                            {item.transfer_type === 'individual' && <IndividualTransferIcon width={48} height={48} />}
                            {item.transfer_type === 'group' && <GroupTransferIcon width={48} height={48} />}
                        </View>
                    </View>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}><Text style={styles.detailLabel}><Ionicons name="calendar-outline" size={14} /> {t('driverHome.date')}</Text><Text style={styles.detailValue}>{moment(item.transfer_datetime).format('DD.MM')}</Text></View>
                        <View style={styles.detailItem}><Text style={styles.detailLabel}><Ionicons name="time-outline" size={14} /> {t('driverHome.time')}</Text><Text style={styles.detailValue}>{moment(item.transfer_datetime).format('HH:mm')}</Text></View>
                        <View style={styles.detailItem}><Text style={styles.detailLabel}><Ionicons name="people-outline" size={14} /> {t('driverHome.people')}</Text><Text style={styles.detailValue}>{item.total_passengers}</Text></View>
                    </View>
                </View>
            </View>
            <View style={styles.dividerContainer}><View style={styles.dividerDot} /><View style={[styles.dividerLine, { borderColor: colors.border }]} /><View style={styles.dividerDot} /></View>
            <View style={styles.routeContainer}>
                <View style={styles.locationRow}>{startIcon}<Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text></View>
                <View style={[styles.routeDottedLine, { borderColor: colors.secondaryText }]} />
                <View style={styles.locationRow}>{endIcon}<Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text></View>
            </View>
            
            {item.passenger_comment && (
                <View style={styles.commentContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.secondaryText} style={styles.commentIcon} />
                    <Text style={styles.commentText} numberOfLines={1}>"{truncatedComment}"</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

const DriverHomeScreen = () => {
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { profile, switchRole } = useAuth();
  const styles = getStyles(colors, theme);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  useEffect(() => {
    const locale = i18n.language === 'en' ? 'en-gb' : i18n.language;
    moment.locale(locale);
  }, [i18n.language]);

  const fetchDriverData = useCallback(async () => {
    try {
        const [requestsPromise, countPromise] = await Promise.all([
            supabase.rpc('get_driver_feed_transfers'),
            supabase.rpc('get_new_transfers_count')
        ]);

        if (requestsPromise.error) throw requestsPromise.error;
        if (countPromise.error) throw countPromise.error;

        setRequests(requestsPromise.data || []);
        setNewRequestsCount(countPromise.data || 0);
    } catch (error) {
        console.error("Error fetching driver data:", error.message);
    }
  }, []);

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchDriverData();
      setRefreshing(false);
  }, [fetchDriverData]);

  useEffect(() => {
    setLoading(true);
    fetchDriverData().finally(() => setLoading(false));

    const channel = supabase
      .channel('public:transfers:driver_home')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transfers' },
        () => fetchDriverData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDriverData]);

  const handleCardPress = useCallback((item) => {
    supabase.rpc('mark_transfer_as_viewed', { p_transfer_id: item.id });
    navigation.navigate('DriverRequest', { transferId: item.id });
  }, [navigation]);
  
  const handleRoleSwitch = useCallback(async (isDriver) => {
    const newRole = isDriver ? 'driver' : 'client';
    setIsSwitchingRole(true);
    const { success, error } = await switchRole(newRole);
    if (!success) {
      Alert.alert(t('common.error'), error);
      setIsSwitchingRole(false);
    }
  }, [switchRole, t]);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* ✨ 2. НОВИЙ АНІМОВАНИЙ ЗАГОЛОВОК */}
      <MotiView 
        from={{ translateY: -50, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        transition={{ type: 'timing', duration: 400 }}
      >
        <View style={styles.header}>
            <Logo width={40} height={40} />
            
            {profile?.is_driver && (
                <View style={styles.switchRow}>
                    <Ionicons name="person-outline" size={18} color={profile.role === 'client' ? colors.primary : colors.secondaryText} />
                    <Switch
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : colors.card}
                        ios_backgroundColor={colors.border}
                        onValueChange={handleRoleSwitch}
                        value={profile.role === 'driver'}
                        disabled={isSwitchingRole}
                    />
                    <Ionicons name="car-sport-outline" size={18} color={profile.role === 'driver' ? colors.primary : colors.secondaryText} />
                </View>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('DriverProfileTab')}>
                {profile?.avatar_url ? (
                    <Image
                        source={{ uri: profile.avatar_url }}
                        style={styles.profilePic}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="disk"
                    />
                ) : (
                    <View style={[styles.profilePic, styles.profilePlaceholder]}>
                        <Ionicons name="person-outline" size={22} color={colors.secondaryText} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
      </MotiView>

      <FlatList
        ListHeaderComponent={
            !loading && (
                <View style={[styles.statusBanner, newRequestsCount > 0 ? styles.newRequestBanner : styles.noNewRequestBanner]}>
                    <Ionicons name={newRequestsCount > 0 ? "notifications-circle" : "checkmark-done-circle-outline"} size={24} color={newRequestsCount > 0 ? colors.primary : '#28a745'} />
                    <Text style={styles.statusText}>{newRequestsCount > 0 ? t('driverHome.newRequests', { count: newRequestsCount }) : t('driverHome.noNewRequests')}</Text>
                </View>
            )
        }
        data={requests}
        renderItem={({ item }) => {
            const isExpiring = moment(item.transfer_datetime).isBefore(moment());
            return (
                <View style={styles.itemContainer}>
                    <Text style={styles.postedTimeText}>{t('driverHome.posted')} {moment(item.created_at).fromNow()}</Text>
                    <TransferRequestCard 
                        item={item} 
                        onPress={() => handleCardPress(item)}
                        isExpiring={isExpiring}
                    />
                </View>
            );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
        ListEmptyComponent={!loading ? <View style={styles.content}><Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} /><Text style={styles.text}>{t('driverHome.noRequests')}</Text></View> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
    </SafeAreaView>
  );
}

export default memo(DriverHomeScreen);

// ✨ 3. ОНОВЛЕНІ СТИЛІ
const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: Platform.OS === 'android' ? 25 : 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profilePlaceholder: {
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: colors.card,
        paddingVertical: Platform.OS === 'ios' ? 6 : 2,
        paddingHorizontal: 10,
        borderRadius: 20,
        ...theme.shadow,
    },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: 50 },
    text: { fontSize: 18, color: colors.secondaryText, textAlign: 'center', marginTop: 16 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8, marginTop: 16 },
    newRequestBanner: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
    noNewRequestBanner: { backgroundColor: '#28a74520', borderColor: '#28a745' },
    statusText: { marginLeft: 10, color: colors.text, fontSize: 15, fontWeight: '600' },
    itemContainer: { marginBottom: 16 },
    postedTimeText: { color: colors.secondaryText, fontSize: 12, textAlign: 'center', marginBottom: 8 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'light' ? 0.08 : 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    expiringCard: {
        backgroundColor: theme === 'dark' ? '#3E2723' : '#FFF3E0',
        borderColor: '#FFA000',
        borderWidth: 1,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 16, backgroundColor: colors.background },
    infoContainer: { flex: 1 },
    nameAndTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    passengerName: { fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1, marginRight: 8 },
    transferIconContainer: { alignItems: 'center', justifyContent: 'center' },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    detailItem: { alignItems: 'center', flex: 1,  },
    detailLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 , justifyContent: 'center' },
    dividerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    routeContainer: {},
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: colors.text, fontSize: 16, marginLeft: 12, fontWeight: '500', flex: 1 },
    routeDottedLine: { height: 20, width: 1, borderLeftWidth: 1, borderStyle: 'dashed', marginLeft: 11, marginVertical: 4 },
    commentContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: colors.border },
    commentIcon: { marginRight: 8 },
    commentText: { color: colors.secondaryText, fontSize: 14, fontStyle: 'italic', flex: 1 },
});

