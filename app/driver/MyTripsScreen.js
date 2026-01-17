import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl, Linking, Alert, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNewTrips } from '../../provider/NewTripsContext';
import { useAuth } from '../../provider/AuthContext';
import Logo from '../../assets/icon.svg';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import { MotiView } from 'moti';

const TripCard = memo(({ item, t, onDelete, onPress }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const navigation = useNavigation();
    
    const formattedDate = moment(item.transfer_datetime).format('D MMMM YYYY');
    const formattedTime = moment(item.transfer_datetime).format('HH:mm');
    const totalPassengers = (item.adults_count || 0) + (item.children_count || 0) + (item.infants_count || 0);
    
    const handleCall = useCallback(() => {
        const passengerPhone = item.passenger?.phone;
        if (passengerPhone) {
            Linking.openURL(`tel:${passengerPhone}`);
        } else {
            Alert.alert(t('myTrips.error'), t('myTrips.noPhone'));
        }
    }, [item.passenger, t]);

    const handleMessage = useCallback(async () => {
        if (!item.passenger?.id) {
            Alert.alert(t('common.error'), 'Passenger ID is missing.');
            return;
        }
        try {
            const { data: roomId, error } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: item.passenger.id });
            if (error) throw error;
            if (!roomId) throw new Error("Could not find or create chat room.");

            navigation.navigate('IndividualChat', {
                roomId: roomId,
                recipientId: item.passenger.id,
                recipientName: item.passenger.full_name,
                recipientAvatar: item.passenger.avatar_url,
                recipientLastSeen: item.passenger.last_seen,
            });
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        }
    }, [item.passenger, navigation, t]);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                    <Image 
                        source={item.passenger?.avatar_url ? { uri: item.passenger.avatar_url } : require('../../assets/default-avatar.png')} 
                        style={styles.avatarImage}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="disk"
                    />
                    <Text style={styles.passengerName}>{item.passenger?.full_name || t('myTrips.noName')}</Text>
                </View>
                <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                    <Text style={styles.timeText}>{formattedTime}</Text>
                </View>
            </View>

            <View style={styles.routeContainer}>
                <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
                <Text style={styles.locationText} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.from')}:</Text> {item.from_location}
                </Text>
            </View>
            <View style={styles.routeContainer}>
                <Ionicons name="flag-outline" size={20} color={colors.secondaryText} />
                <Text style={styles.locationText} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.to')}:</Text> {item.to_location}
                </Text>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}><Ionicons name="people-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText}>{totalPassengers}</Text></View>
                {item.luggage_info && (<View style={styles.detailItem}><Ionicons name="briefcase-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText} numberOfLines={1}>{item.luggage_info}</Text></View>)}
                <View style={styles.detailItem}><Ionicons name="car-sport-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText} numberOfLines={1}>{item.transfer_type}</Text></View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMessage}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /><Text style={[styles.actionButtonText, { color: colors.primary }]}>{t('myTrips.message')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleCall}><Ionicons name="call-outline" size={20} color="#fff" /><Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('myTrips.call')}</Text></TouchableOpacity>
            </View>

            {onDelete && (<TouchableOpacity style={styles.deleteButton} onPress={onDelete}><Ionicons name="trash-outline" size={20} color="#D32F2F" /><Text style={styles.deleteButtonText}>{t('myTrips.delete')}</Text></TouchableOpacity>)}
        </TouchableOpacity>
    );
});


const MyTripsScreen = () => {
    const { colors, theme } = useTheme();
    const { t, i18n } = useTranslation();
    const { session } = useAuth();
    const navigation = useNavigation();
    const { clearNewTripsCount } = useNewTrips();
    const styles = getStyles(colors, theme);

    const [allTrips, setAllTrips] = useState([]);
    const [viewMode, setViewMode] = useState('active');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tabWidth, setTabWidth] = useState(0);

    useEffect(() => {
        const locale = i18n.language === 'en' ? 'en-gb' : i18n.language;
        moment.locale(locale);
    }, [i18n.language]);

    useFocusEffect(useCallback(() => { clearNewTripsCount(); }, [clearNewTripsCount]));

    const fetchTrips = useCallback(async () => {
        if (!session?.user?.id) return;
        try {
            const { data, error } = await supabase
                .from('transfers')
                .select('*, passenger:passenger_id(id, full_name, phone, avatar_url, last_seen)')
                .eq('accepted_driver_id', session.user.id) 
                .in('status', ['accepted', 'completed'])
                .order('transfer_datetime', { ascending: true });

            if (error) throw error;
            setAllTrips(data || []);
        } catch (e) { console.error("Error fetching trips:", e.message); } 
    }, [session]);

    useEffect(() => {
        if (session?.user?.id) {
            setIsLoading(true);
            fetchTrips().finally(() => setIsLoading(false));

            const tripsSubscription = supabase
                .channel('public:transfers:driver_trips')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'transfers', filter: `accepted_driver_id=eq.${session.user.id}` },
                    () => fetchTrips()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(tripsSubscription);
            };
        } else {
            setAllTrips([]);
            setIsLoading(false);
        }
    }, [session, fetchTrips]);

    const onRefresh = useCallback(async () => { 
        setRefreshing(true); 
        await fetchTrips();
        setRefreshing(false);
    }, [fetchTrips]);

  const { activeTrips, archivedTrips } = useMemo(() => {
        const twoDaysAgo = moment().subtract(2, 'days');
        
        return allTrips.reduce((acc, trip) => {
            if (trip.status === 'completed' || moment(trip.transfer_datetime).isBefore(twoDaysAgo)) {
                acc.archivedTrips.push(trip);
            } else {
                acc.activeTrips.push(trip);
            }
            return acc;
        }, { activeTrips: [], archivedTrips: [] });
    }, [allTrips]);
    
    const handleDeleteTrip = useCallback((tripId) => {
        Alert.alert(
            t('myTrips.confirmDeleteTitle'),
            t('myTrips.confirmDeleteText'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.confirm'), style: 'destructive', onPress: async () => {
                    const originalTrips = allTrips;
                    setAllTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId));
                    const { error } = await supabase.from('transfers').delete().eq('id', tripId);
                    if (error) { 
                        Alert.alert(t('common.error'), error.message); 
                        setAllTrips(originalTrips);
                    } 
                }}
            ]
        );
    }, [allTrips, t]);

    const tripsToDisplay = viewMode === 'active' ? activeTrips : archivedTrips;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}><Logo width={40} height={40} />
                    <Text style={styles.title}>{t('myTrips.title')}</Text>
                    <View style={{ width: 40 }} /> 
                </View>
                <View 
                    style={styles.tabContainer}
                    onLayout={(event) => setTabWidth(event.nativeEvent.layout.width)}
                >
                    {tabWidth > 0 && (
                        <MotiView
                            style={[styles.animatedThumb, { width: (tabWidth - 8) / 2 }]}
                            animate={{ translateX: viewMode === 'active' ? 0 : (tabWidth / 2) - 2 }}
                            transition={{ type: 'timing', duration: 250 }}
                        />
                    )}
                    <TouchableOpacity style={styles.tabButton} onPress={() => setViewMode('active')}>
                        <Text style={viewMode === 'active' ? styles.activeTabText : styles.inactiveTabText}>{t('myTrips.active')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tabButton} onPress={() => setViewMode('archived')}>
                        <Text style={viewMode === 'archived' ? styles.activeTabText : styles.inactiveTabText}>{t('myTrips.archive')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading && !refreshing ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={tripsToDisplay}
                    renderItem={({ item, index }) => (
                        <MotiView
                            from={{ opacity: 0, translateY: 50 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 500, delay: index * 150 }}
                        >
                            <TripCard 
                                item={item} 
                                t={t} 
                                onDelete={viewMode === 'archived' ? () => handleDeleteTrip(item.id) : null}
                                onPress={() => navigation.navigate('DriverRequest', { transferId: item.id })}
                            />
                        </MotiView>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20, paddingHorizontal: 16 }}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Ionicons name="car-sport-outline" size={60} color={colors.secondaryText} />
                            <Text style={styles.emptyText}>{viewMode === 'active' ? t('myTrips.emptyListActive') : t('myTrips.emptyListArchived')}</Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                />
            )}
        </SafeAreaView>
    );
}

export default memo(MyTripsScreen);

const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    headerContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', flex: 1 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 25, padding: 4, position: 'relative', borderWidth: 1, borderColor: colors.border },
    animatedThumb: { position: 'absolute', top: 4, left: 4, bottom: 4, backgroundColor: colors.primary, borderRadius: 21 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 21, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    activeTabText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
    inactiveTabText: { color: colors.secondaryText, fontWeight: '600', fontSize: 14 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { marginTop: 16, fontSize: 18, textAlign: 'center', color: colors.secondaryText },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, marginVertical: 8, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: theme === 'light' ? 0.05 : 0.1, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: colors.border },
    passengerName: { fontSize: 16, fontWeight: '600', flexShrink: 1, color: colors.text },
    dateTimeContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background },
    dateText: { fontSize: 12, fontWeight: '500', textAlign: 'right', color: colors.text },
    timeText: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', color: colors.primary },
    routeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    locationText: { marginLeft: 10, fontSize: 14, flexShrink: 1, color: colors.text },
    detailsContainer: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: 16, paddingVertical: 10 },
    detailItem: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
    detailIcon: { marginRight: 6 },
    detailText: { fontSize: 14, fontWeight: '500', color: colors.text },
    actionsContainer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around', gap: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, flex: 1, backgroundColor: colors.background },
    actionButtonText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, marginTop: 10, borderTopWidth: 1, borderColor: colors.border },
    deleteButtonText: { marginLeft: 8, color: '#D32F2F', fontWeight: 'bold' },
}); 