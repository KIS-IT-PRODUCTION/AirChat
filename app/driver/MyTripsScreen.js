import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl, Linking, Alert, Image, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../provider/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNewTrips } from '../../provider/NewTripsContext';

// Компонент для відображення однієї картки поїздки
const TripCard = ({ item, t, navigation, onDelete }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    const tripDate = new Date(item.transfer_datetime);
    const formattedDate = tripDate.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTime = tripDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalPassengers = (item.adults_count || 0) + (item.children_count || 0) + (item.infants_count || 0);
    
    const handleCall = () => {
        const passengerPhone = item.passenger?.phone;
        if (passengerPhone) {
            Linking.openURL(`tel:${passengerPhone}`);
        } else {
            Alert.alert(t('myTrips.error', 'Помилка'), t('myTrips.noPhone', 'Номер телефону пасажира не вказано.'));
        }
    };

    // ✨ ВИПРАВЛЕНА ФУНКЦІЯ, ПОВЕРНУТА ДО ОРИГІНАЛЬНОЇ ВЕРСІЇ
    const handleMessage = async () => {
        if (!item.passenger?.id) {
            Alert.alert(t('common.error'), 'Passenger ID is missing.');
            return;
        }
        try {
            // 1. Викликаємо правильну функцію в базі, щоб отримати ID кімнати
            const { data: roomId, error } = await supabase.rpc('find_or_create_chat_room', {
                p_recipient_id: item.passenger.id
            });
            if (error) throw error;
            if (!roomId) throw new Error("Could not find or create chat room.");

            // 2. Переходимо на екран чату з правильними параметрами
            navigation.navigate('MessagesTab', {
                screen: 'IndividualChat',
                params: {
                    roomId: roomId,
                    recipientId: item.passenger.id,
                    recipientName: item.passenger.full_name,
                    recipientAvatar: item.passenger.avatar_url,
                    recipientLastSeen: item.passenger.last_seen,
                },
            });
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                    {item.passenger?.avatar_url ? (
                        <Image source={{ uri: item.passenger.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                    )}
                    <Text style={styles.passengerName}>{item.passenger?.full_name || t('myTrips.noName', 'Ім\'я не вказано')}</Text>
                </View>
                <View style={styles.dateTimeContainer}>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                    <Text style={styles.timeText}>{formattedTime}</Text>
                </View>
            </View>

            <View style={styles.routeContainer}>
                <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
                <Text style={styles.locationText} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.from', 'Звідки')}:</Text> {item.from_location}
                </Text>
            </View>
            <View style={styles.routeContainer}>
                <Ionicons name="flag-outline" size={20} color={colors.secondaryText} />
                <Text style={styles.locationText} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.to', 'Куди')}:</Text> {item.to_location}
                </Text>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}><Ionicons name="people-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText}>{totalPassengers}</Text></View>
                {item.luggage_info && (<View style={styles.detailItem}><Ionicons name="briefcase-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText} numberOfLines={1}>{item.luggage_info}</Text></View>)}
                <View style={styles.detailItem}><Ionicons name="car-sport-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} /><Text style={styles.detailText} numberOfLines={1}>{item.transfer_type}</Text></View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMessage}><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} /><Text style={[styles.actionButtonText, { color: colors.primary }]}>{t('myTrips.message', 'Повідомлення')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleCall}><Ionicons name="call-outline" size={20} color="#fff" /><Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('myTrips.call', 'Дзвінок')}</Text></TouchableOpacity>
            </View>

            {onDelete && (<TouchableOpacity style={styles.deleteButton} onPress={onDelete}><Ionicons name="trash-outline" size={20} color="#D32F2F" /><Text style={styles.deleteButtonText}>{t('myTrips.delete', 'Видалити з архіву')}</Text></TouchableOpacity>)}
        </View>
    );
};


export default function MyTripsScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { session } = useAuth();
    const navigation = useNavigation();
    const { clearNewTripsCount } = useNewTrips();
    const styles = getStyles(colors);

    const [allTrips, setAllTrips] = useState([]);
    const [viewMode, setViewMode] = useState('active');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(useCallback(() => { clearNewTripsCount(); }, [clearNewTripsCount]));

    const fetchTrips = useCallback(async () => {
        if (!session?.user?.id) return setIsLoading(false);
        try {
            const { data, error } = await supabase.from('transfers').select('*, passenger:passenger_id(id, full_name, phone, avatar_url, last_seen)').eq('driver_id', session.user.id).in('status', ['accepted', 'completed']).order('transfer_datetime', { ascending: false });
            if (error) throw error;
            setAllTrips(data || []);
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); setRefreshing(false); }
    }, [session]);

    useFocusEffect(useCallback(() => { setIsLoading(true); fetchTrips(); }, [fetchTrips]));

    const onRefresh = useCallback(() => { setRefreshing(true); fetchTrips(); }, [fetchTrips]);

    const { activeTrips, archivedTrips } = useMemo(() => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return allTrips.reduce((acc, trip) => {
            (new Date(trip.transfer_datetime) < twoDaysAgo ? acc.archivedTrips : acc.activeTrips).push(trip);
            return acc;
        }, { activeTrips: [], archivedTrips: [] });
    }, [allTrips]);
    
    const handleDeleteTrip = (tripId) => {
        Alert.alert(
            t('myTrips.confirmDeleteTitle', 'Видалити поїздку?'),
            t('myTrips.confirmDeleteText', 'Ця дія є незворотною.'),
            [
                { text: t('common.cancel', 'Скасувати'), style: 'cancel' },
                { text: t('common.confirm', 'Видалити'), style: 'destructive', onPress: async () => {
                    const { error } = await supabase.from('transfers').delete().eq('id', tripId);
                    if (error) { Alert.alert(t('common.error', 'Помилка'), error.message); } 
                    else { setAllTrips(prevTrips => prevTrips.filter(trip => trip.id !== tripId)); }
                }}
            ]
        );
    };

    const tripsToDisplay = viewMode === 'active' ? activeTrips : archivedTrips;

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>{t('myTrips.title', 'Мої поїздки')}</Text>

            <View style={styles.viewModeContainer}>
                <TouchableOpacity style={[styles.viewModeButton, viewMode === 'active' && { backgroundColor: colors.primary }]} onPress={() => setViewMode('active')}>
                    <Text style={[styles.viewModeText, viewMode === 'active' ? { color: '#fff' } : { color: colors.text }]}>{t('myTrips.active', 'Активні')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.viewModeButton, viewMode === 'archived' && { backgroundColor: colors.primary }]} onPress={() => setViewMode('archived')}>
                    <Text style={[styles.viewModeText, viewMode === 'archived' ? { color: '#fff' } : { color: colors.text }]}>{t('myTrips.archive', 'Архів')}</Text>
                </TouchableOpacity>
            </View>

            {isLoading && !refreshing ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={tripsToDisplay}
                    renderItem={({ item }) => <TripCard item={item} t={t} navigation={navigation} onDelete={viewMode === 'archived' ? () => handleDeleteTrip(item.id) : null} />}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Ionicons name="car-sport-outline" size={60} color={colors.secondaryText} />
                            <Text style={styles.emptyText}>{viewMode === 'active' ? t('myTrips.emptyListActive', 'У вас немає активних поїздок') : t('myTrips.emptyListArchived', 'Архів порожній')}</Text>
                        </View>
                    }
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginHorizontal: 16, marginTop: 16, color: colors.text },
    emptyText: { marginTop: 16, fontSize: 18, textAlign: 'center', color: colors.secondaryText },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, marginVertical: 8, marginHorizontal: 16, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3.0, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: colors.border },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: colors.primary },
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
    actionsContainer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-around' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, flex: 1, marginHorizontal: 5, backgroundColor: colors.background },
    actionButtonText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold' },
    viewModeContainer: { flexDirection: 'row', justifyContent: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.card, borderRadius: 10, padding: 4 },
    viewModeButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    viewModeText: { fontWeight: 'bold', fontSize: 14, },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, marginTop: 10, borderTopWidth: 1, borderColor: colors.border },
    deleteButtonText: { marginLeft: 8, color: '#D32F2F', fontWeight: 'bold' },
});