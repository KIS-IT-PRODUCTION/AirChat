// app/TransferDetailScreen.js
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

// --- Допоміжний компонент для рядка інформації ---
const InfoRow = ({ icon, label, value, colors }) => {
  const styles = getStyles(colors);
  if (!value) return null;
  return (
    <View style={styles.infoRowContainer}>
      <Ionicons name={icon} size={24} color={colors.secondaryText} style={styles.infoRowIcon} />
      <View>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
};

// --- Компонент для картки пропозиції від водія ---
const DriverOfferCard = ({ offer, onAccept, isAccepting }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();

    return(
        <View style={styles.driverCard}>
            <View style={styles.driverCardHeader}>
                <Image source={offer.driver_avatar_url ? { uri: offer.driver_avatar_url } : require('../assets/default-avatar.png')} style={styles.driverAvatar} />
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{offer.driver_name}</Text>
                    {/* ✨ ВІДОБРАЖАЄМО МАРКУ ТА МОДЕЛЬ АВТО */}
                    <Text style={styles.driverCarText}>{offer.car_make} {offer.car_model}</Text>
                </View>
            </View>
            {offer.driver_comment && <Text style={styles.driverMessageText}>"{offer.driver_comment}"</Text>}
            <View style={styles.driverActionRow}>
                <Text style={styles.driverPrice}>{offer.price} грн</Text>
                <TouchableOpacity style={styles.chooseDriverButton} onPress={onAccept} disabled={isAccepting}>
                    {isAccepting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.chooseDriverButtonText}>{t('transferDetail.acceptOffer', 'Прийняти')}</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- ОСНОВНИЙ КОМПОНЕНТ ЕКРАНА ---
export default function TransferDetailScreen({ navigation, route }) {
  const { transferId } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, i18n } = useTranslation();
  const mapViewRef = useRef(null);

  const [transferData, setTransferData] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  
  const MAPS_API_KEY = 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: transferDetails, error: transferError } = await supabase.rpc('get_transfer_details', { p_transfer_id: transferId }).single();
      if (transferError) throw transferError;
      setTransferData(transferDetails);
      
      if (transferDetails.status === 'pending') {
          const { data: offersData, error: offersError } = await supabase.rpc('get_transfer_offers', { p_transfer_id: transferId });
          if (offersError) throw offersError;
          setOffers(offersData);
      }

      if (transferDetails) { fetchRoute(transferDetails.from_location, transferDetails.to_location); }
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setLoading(false); }
  }, [transferId, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAcceptOffer = async (offer) => {
      setIsAccepting(true);
      try {
          const { error } = await supabase.rpc('accept_offer', {
              p_offer_id: offer.offer_id,
              p_transfer_id: transferId,
              p_driver_id: offer.driver_id,
          });
          if (error) throw error;
          
          Alert.alert(t('common.success'), t('transferDetail.driverConfirmed', 'Водія підтверджено!'));
          fetchData(); // Оновлюємо дані на екрані
      } catch (error) {
          Alert.alert(t('common.error'), error.message);
      } finally {
          setIsAccepting(false);
      }
  };

  const fetchRoute = async (origin, destination) => {
    if (MAPS_API_KEY === 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo') { return; }
    try {
      // ✨ ВИПРАВЛЕНО: Передаємо `i18n.language` замість всього об'єкта
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}&language=${i18n.language}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.routes?.length > 0) {
        const route = json.routes[0];
        const points = polyline.decode(route.overview_polyline.points);
        const coords = points.map(point => ({ latitude: point[0], longitude: point[1] }));
        setRouteCoordinates(coords);
        if (route.legs?.length > 0) { setRouteInfo({ distance: route.legs[0].distance.text, duration: route.legs[0].duration.text }); }
      }
    } catch (error) { console.error("Error fetching route:", error); }
  };

  const fitMapToRoute = () => {
    if (mapViewRef.current && routeCoordinates.length > 1) {
      mapViewRef.current.fitToCoordinates(routeCoordinates, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    }
  };

  const handleCancelTransfer = async () => {
    Alert.alert(t('transferDetail.cancelConfirmTitle', 'Скасувати заявку?'), t('transferDetail.cancelConfirmText', 'Цю дію не можна буде повернути.'), [{ text: t('common.no'), style: 'cancel' }, { text: t('common.yes'), style: 'destructive', onPress: async () => { try { const { error } = await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', transferId); if (error) throw error; Alert.alert(t('common.success'), t('transferDetail.cancelledSuccess')); navigation.goBack(); } catch (error) { Alert.alert(t('common.error'), error.message); } } }]);
  };

  if (loading) { return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>; }
  if (!transferData) { return <View style={styles.container}><Text style={styles.sectionTitle}>{t('transferDetail.notFound', 'Заявку не знайдено.')}</Text></View>; }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('transferDetail.title', 'Деталі заявки')}</Text><Logo width={40} height={40} /></View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.userInfoSection}><Image source={transferData.passenger_avatar_url ? { uri: transferData.passenger_avatar_url } : require('../assets/default-avatar.png')} style={styles.userAvatar} /><Text style={styles.userName}>{transferData.passenger_name}</Text></View>
        <View style={styles.infoCard}><InfoRow icon="airplane-outline" label={t('transferDetail.from')} value={transferData.from_location} colors={colors} /><View style={styles.dottedLine} /><InfoRow icon="location-outline" label={t('transferDetail.to')} value={transferData.to_location} colors={colors} /></View>
        <View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.detailsTitle', 'Деталі поїздки')}</Text><View style={styles.detailsGrid}><View style={styles.detailItem}><Ionicons name="calendar-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData.transfer_datetime).format('D MMM')}</Text></View><View style={styles.detailItem}><Ionicons name="time-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData.transfer_datetime).format('HH:mm')}</Text></View><View style={styles.detailItem}><Ionicons name="people-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{transferData.passenger_count} {t('transferDetail.passengers', 'пас.')}</Text></View></View><View style={styles.divider} /><InfoRow icon="briefcase-outline" label={t('transferDetail.luggage', 'Багаж')} value={transferData.luggage_info} colors={colors} />{transferData.with_pet && <InfoRow icon="paw-outline" label={t('transferDetail.withPet', 'З тваринкою')} value={t('transferDetail.yes', 'Так')} colors={colors} /> }<InfoRow icon="car-sport-outline" label={t('transferDetail.transferType', 'Тип трансферу')} value={transferData.transfer_type} colors={colors} /></View>
        {transferData.passenger_comment && (<View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.clientComment', 'Ваш коментар')}</Text><Text style={styles.commentText}>"{transferData.passenger_comment}"</Text></View>)}
        <View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.route', 'Маршрут на карті')}</Text><View style={styles.mapContainer}><MapView ref={mapViewRef} style={StyleSheet.absoluteFill} onMapReady={fitMapToRoute}>{routeCoordinates.length > 0 && (<><Marker coordinate={routeCoordinates[0]}/><Marker coordinate={routeCoordinates[routeCoordinates.length - 1]}/><Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} /></>)}</MapView></View>{routeInfo && (<View style={styles.routeInfoContainer}><View style={styles.routeInfoItem}><Ionicons name="speedometer-outline" size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{routeInfo.distance}</Text></View></View>)}</View>

        {transferData.status === 'pending' && (
            <View style={styles.offersSection}>
                <Text style={styles.sectionTitle}>{t('transferDetail.driverOffers', 'Пропозиції водіїв')}</Text>
                {offers.length > 0 ? (
                    offers.map(offer => (
                        <DriverOfferCard key={offer.offer_id} offer={offer} onAccept={() => handleAcceptOffer(offer)} isAccepting={isAccepting} />
                    ))
                ) : (
                    <Text style={styles.noOffersText}>{t('transferDetail.noOffers', 'Ще немає пропозицій. Зачекайте, водії скоро відгукнуться.')}</Text>
                )}
            </View>
        )}
        
        {transferData.status === 'pending' && (<TouchableOpacity style={styles.cancelButton} onPress={handleCancelTransfer}><Text style={styles.cancelButtonText}>{t('transferDetail.cancelTransfer', 'Скасувати заявку')}</Text><Ionicons name="close-circle-outline" size={20} color="#fff" /></TouchableOpacity>)}
      </ScrollView>
    </SafeAreaView>
  );
}
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
    offersSection: { marginHorizontal: 16, marginTop: 16 },
    noOffersText: { color: colors.secondaryText, textAlign: 'center', fontStyle: 'italic', padding: 20 },
    driverCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    driverCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    driverAvatar: { width: 50, height: 50, borderRadius: 25 },
    driverInfo: { flex: 1, marginLeft: 12 },
    driverName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    driverCarText: { color: colors.secondaryText, fontSize: 14, marginTop: 4 },
    driverMessageText: { color: colors.text, fontStyle: 'italic', marginBottom: 12 },
    driverActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    chooseDriverButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    chooseDriverButtonText: { color: '#fff', fontWeight: 'bold' },
    driverPrice: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
});
