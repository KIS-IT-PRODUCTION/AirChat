// app/TransferDetailScreen.js
// ... (всі імпорти та компонент InfoRow без змін) ...
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';

const InfoRow = ({ icon, label, value, colors }) => { const styles = getStyles(colors); if (!value) return null; return ( <View style={styles.infoRowContainer}><Ionicons name={icon} size={24} color={colors.secondaryText} style={styles.infoRowIcon} /><View><Text style={styles.infoRowLabel}>{label}</Text><Text style={styles.infoRowValue}>{value}</Text></View></View> ); };

export default function TransferDetailScreen({ navigation, route }) {
    const { transferId } = route.params;
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t, i18n } = useTranslation();
    const mapViewRef = useRef(null);

    const [transferData, setTransferData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [routeInfo, setRouteInfo] = useState(null);
    
    const MAPS_API_KEY = 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo';

    const fetchTransferDetails = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_transfer_details', { p_transfer_id: transferId }).single();
            if (error) throw error;
            setTransferData(data);
            if (data) { fetchRoute(data.from_location, data.to_location); }
        } catch (error) { Alert.alert(t('common.error'), error.message); } 
        finally { setLoading(false); }
    }, [transferId, t]);

    useEffect(() => { fetchTransferDetails(); }, [fetchTransferDetails]);

    const fetchRoute = async (origin, destination) => {

        try {
            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}`;
            const response = await fetch(url);
            const json = await response.json();
            if (json.routes && json.routes.length > 0) {
                const route = json.routes[0];
                const points = polyline.decode(route.overview_polyline.points);
                const coords = points.map(point => ({ latitude: point[0], longitude: point[1] }));
                setRouteCoordinates(coords);
                if (route.legs && route.legs.length > 0) { setRouteInfo({ distance: route.legs[0].distance.text, duration: route.legs[0].duration.text }); }
            }
        } catch (error) { console.error("Error fetching route:", error); }
    };
    
    // ... (fitMapToRoute та handleCancelTransfer без змін) ...
    const fitMapToRoute = () => { if (mapViewRef.current && routeCoordinates.length > 1) { mapViewRef.current.fitToCoordinates(routeCoordinates, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true, }); } };
    const handleCancelTransfer = async () => { Alert.alert( t('transferDetail.cancelConfirmTitle', 'Скасувати заявку?'), t('transferDetail.cancelConfirmText', 'Цю дію не можна буде повернути.'), [ { text: t('common.no'), style: 'cancel' }, { text: t('common.yes'), style: 'destructive', onPress: async () => { try { const { error } = await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', transferId); if (error) throw error; Alert.alert(t('common.success'), t('transferDetail.cancelledSuccess')); navigation.goBack(); } catch (error) { Alert.alert(t('common.error'), error.message); } }, }, ] ); };

    if (loading) { return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>; }
    if (!transferData) { return <View style={styles.container}><Text style={styles.sectionTitle}>{t('transferDetail.notFound', 'Заявку не знайдено.')}</Text></View>; }

    // ✨ ВИЗНАЧАЄМО НАПРЯМОК НА ОСНОВІ ДАНИХ З БАЗИ
    const tripDirection = transferData.direction === 'from_airport'
        ? { text: t('transferDetail.fromAirport', 'З аеропорту'), icon: 'airplane-outline' }
        : { text: t('transferDetail.toAirport', 'В аеропорт'), icon: 'airplane-outline' };

    return (
        <SafeAreaView style={styles.container}>
          {/* ... (хедер та верхні блоки без змін) ... */}
          <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('transferDetail.title', 'Деталі заявки')}</Text><Logo width={40} height={40} /></View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.userInfoSection}><Image source={transferData.passenger_avatar_url ? { uri: transferData.passenger_avatar_url } : require('../assets/default-avatar.jpg')} style={styles.userAvatar} /><Text style={styles.userName}>{transferData.passenger_name}</Text></View>
            <View style={styles.infoCard}><InfoRow icon="airplane-outline" label={t('transferDetail.from')} value={transferData.from_location} colors={colors} /><View style={styles.dottedLine} /><InfoRow icon="location-outline" label={t('transferDetail.to')} value={transferData.to_location} colors={colors} /></View>
            <View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.detailsTitle', 'Деталі поїздки')}</Text><View style={styles.detailsGrid}><View style={styles.detailItem}><Ionicons name="calendar-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData.transfer_datetime).format('D MMM')}</Text></View><View style={styles.detailItem}><Ionicons name="time-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData.transfer_datetime).format('HH:mm')}</Text></View><View style={styles.detailItem}><Ionicons name="people-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{transferData.passenger_count} {t('transferDetail.passengers', 'пас.')}</Text></View></View><View style={styles.divider} /><InfoRow icon="briefcase-outline" label={t('transferDetail.luggage', 'Багаж')} value={transferData.luggage_info} colors={colors} />{transferData.with_pet && <InfoRow icon="paw-outline" label={t('transferDetail.withPet', 'З тваринкою')} value={t('transferDetail.yes', 'Так')} colors={colors} /> }<InfoRow icon="car-sport-outline" label={t('transferDetail.transferType', 'Тип трансферу')} value={transferData.transfer_type} colors={colors} /></View>
            {transferData.passenger_comment && (<View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.clientComment', 'Ваш коментар')}</Text><Text style={styles.commentText}>"{transferData.passenger_comment}"</Text></View>)}
            
            <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('transferDetail.route', 'Маршрут на карті')}</Text>
                <View style={styles.mapContainer}><MapView ref={mapViewRef} style={StyleSheet.absoluteFill} onMapReady={fitMapToRoute}>{routeCoordinates.length > 0 && (<><Marker coordinate={routeCoordinates[0]} title={t('transferDetail.start')} /><Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title={t('transferDetail.finish')} /><Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} /></>)}</MapView></View>
                
                {routeInfo && (
                    <View style={styles.routeInfoContainer}>
                        <View style={styles.routeInfoItem}><Ionicons name="speedometer-outline" size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{routeInfo.distance}</Text></View>
                        {/* ✨ ВИКОРИСТОВУЄМО ОНОВЛЕНУ ЗМІННУ */}
                        <View style={styles.routeInfoItem}><Ionicons name={tripDirection.icon} size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{tripDirection.text}</Text></View>
                    </View>
                )}
            </View>
            
            {transferData.status === 'pending' && (<TouchableOpacity style={styles.cancelButton} onPress={handleCancelTransfer}><Text style={styles.cancelButtonText}>{t('transferDetail.cancelTransfer', 'Скасувати заявку')}</Text><Ionicons name="close-circle-outline" size={20} color="#fff" /></TouchableOpacity>)}
          </ScrollView>
        </SafeAreaView>
      );
}

// ... (стилі без змін) ...
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,  borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    scrollContent: { paddingBottom: 40 },
    userInfoSection: { alignItems: 'center', paddingTop: 16 },
    userAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, backgroundColor: colors.card },
    userName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    infoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 16 },
    infoRowContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    infoRowIcon: { marginRight: 16, width: 24 },
    infoRowLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 2 },
    infoRowValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
    dottedLine: { height: 16, width: 1, backgroundColor: colors.border, marginVertical: 4, marginLeft: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    detailItem: { alignItems: 'center', flex: 1 },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
    commentText: { color: colors.secondaryText, fontStyle: 'italic', fontSize: 15 },
    mapContainer: { height: 220, borderRadius: 12, overflow: 'hidden' },
    routeInfoContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    routeInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    routeInfoText: { color: colors.text, fontSize: 16, fontWeight: '500' },
    cancelButton: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, margin: 16 },
    cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
