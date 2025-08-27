
import React, { useState, useCallback } from 'react';import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, RefreshControl, Linking, Alert, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../provider/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native-gesture-handler';

// Компонент для відображення однієї картки поїздки
const TripCard = ({ item, colors, t, navigation }) => {
    const tripDate = new Date(item.transfer_datetime);
    const formattedDate = tripDate.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedTime = tripDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // ✨ Розраховуємо загальну кількість пасажирів
    const totalPassengers = (item.adults_count || 0) + (item.children_count || 0) + (item.infants_count || 0);
    
       const handleCall = () => {
        const passengerPhone = item.passenger?.phone;
        if (passengerPhone) {
            Linking.openURL(`tel:${passengerPhone}`);
        } else {
            Alert.alert(t('myTrips.error'), t('myTrips.noPhone'));
        }
    };

    // ✨ ОНОВЛЕНА ФУНКЦІЯ ДЛЯ ПЕРЕХОДУ В ЧАТ
    const handleMessage = async () => {
        if (!item.passenger?.id) {
            Alert.alert(t('common.error'), 'Passenger ID is missing.');
            return;
        }
        try {
            // 1. Викликаємо функцію в базі, щоб отримати ID кімнати
            const { data: roomId, error } = await supabase.rpc('find_or_create_chat_room', {
                p_recipient_id: item.passenger.id
            });
            if (error) throw error;
            if (!roomId) throw new Error("Could not find or create chat room.");

            // 2. Переходимо на екран чату з усіма потрібними даними
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
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                    {item.passenger?.avatar_url ? (
                        <Image source={{ uri: item.passenger.avatar_url }} style={styles.avatarImage} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                    )}
                    <Text style={[styles.passengerName, { color: colors.text }]}>{item.passenger?.full_name || t('myTrips.noName')}</Text>
                </View>
                <View style={[styles.dateTimeContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{formattedDate}</Text>
                    <Text style={[styles.timeText, { color: colors.primary }]}>{formattedTime}</Text>
                </View>
            </View>

            <View style={styles.routeContainer}>
                <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
                <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.from')}:</Text> {item.from_location}
                </Text>
            </View>
            <View style={styles.routeContainer}>
                <Ionicons name="flag-outline" size={20} color={colors.secondaryText} />
                <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                    <Text style={{fontWeight: 'bold'}}>{t('myTrips.to')}:</Text> {item.to_location}
                </Text>
            </View>

            {/* ✨ НОВИЙ БЛОК З ДЕТАЛЯМИ ПОЇЗДКИ */}
            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} />
                    <Text style={[styles.detailText, { color: colors.text }]}>{totalPassengers}</Text>
                </View>
                {item.luggage_info && (
                    <View style={styles.detailItem}>
                        <Ionicons name="briefcase-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} />
                        <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{item.luggage_info}</Text>
                    </View>
                )}
                <View style={styles.detailItem}>
                    <Ionicons name="car-sport-outline" size={20} color={colors.secondaryText} style={styles.detailIcon} />
                    <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{item.transfer_type}</Text>
                </View>
            </View>

            <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.background }]} onPress={handleMessage}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>{t('myTrips.message')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleCall}>
                    <Ionicons name="call-outline" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, { color: '#fff' }]}>{t('myTrips.call')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function MyTripsScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { session } = useAuth();
    const navigation = useNavigation();
    
    const [trips, setTrips] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchAcceptedTrips = useCallback(async () => {
        if (!session?.user?.id) {
            setIsLoading(false);
            return;
        };
        try {
            setError(null);
            // Запит вже містить усі необхідні поля, тому тут нічого не міняємо
            const { data, error } = await supabase
                .from('transfers')
                .select('*, passenger:passenger_id(id, full_name, phone, avatar_url, last_seen)')
                .eq('driver_id', session.user.id)
                .eq('status', 'accepted')
                .order('transfer_datetime', { ascending: true });

            if (error) throw error;
            setTrips(data || []);
        } catch (e) {
            setError(e.message);
            console.error(e);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [session]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            fetchAcceptedTrips();
        }, [fetchAcceptedTrips])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAcceptedTrips();
    }, [fetchAcceptedTrips]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('myTrips.title')}</Text>
            {error && <Text style={styles.errorText}>Помилка: {error}</Text>}
            {isLoading && !refreshing ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={trips}
                    renderItem={({ item }) => <TripCard item={item} colors={colors} t={t} navigation={navigation} />}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ flexGrow: 1 }}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Ionicons name="car-sport-outline" size={60} color={colors.secondaryText} />
                            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t('myTrips.emptyList')}</Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', margin: 16 },
    errorText: { color: 'red', textAlign: 'center', margin: 16 },
    emptyText: { marginTop: 16, fontSize: 18, textAlign: 'center' },
    card: { borderRadius: 12, marginVertical: 8, marginHorizontal: 16, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3.0, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#ccc' },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    passengerName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
    dateTimeContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    dateText: { fontSize: 12, fontWeight: '500', textAlign: 'right' },
    timeText: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
    routeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    locationText: { marginLeft: 10, fontSize: 14, flexShrink: 1 },
    // ✨ НОВІ СТИЛІ ДЛЯ ДЕТАЛЕЙ
    detailsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee', // або colors.border
        marginTop: 16,
        paddingVertical: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    detailIcon: {
        marginRight: 6,
    },
    detailText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionsContainer: {
        marginTop: 16,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        flex: 1,
        marginHorizontal: 5,
    },
    actionButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
    },
});