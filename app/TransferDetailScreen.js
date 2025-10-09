import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import { useNavigation } from '@react-navigation/native';
import { MotiView } from 'moti';

// --- Допоміжні компоненти (без змін) ---
const InfoRow = ({ icon, label, value, colors, valueStyle }) => {
  const styles = getStyles(colors);
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRowContainer}>
      <Ionicons name={icon} size={24} color={colors.secondaryText} style={styles.infoRowIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        {React.isValidElement(value) ? value : <Text style={[styles.infoRowValue, valueStyle]}>{value}</Text>}
      </View>
    </View>
  );
};

const DetailItem = ({ icon, value, label, colors }) => {
  const styles = getStyles(colors);
  if (!value) return null;
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={24} color={colors.secondaryText} />
      <Text style={styles.detailValue}>{value}</Text>
      {label && <Text style={styles.detailLabel}>{label}</Text>}
    </View>
  );
};

const DriverOfferCard = ({ offer, onAccept, isAccepting }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const navigation = useNavigation();
    const displayPrice = `${offer.price} ${offer.currency || t('common.currency_uah', 'UAH')}`;

    return(
        <View style={styles.driverCard}>
            <TouchableOpacity 
                style={styles.driverCardHeader}
                onPress={() => navigation.navigate('PublicDriverProfile', { 
                    driverId: offer.driver_id,
                    driverName: offer.driver_name 
                })}
            >
                <Image 
                    source={offer.driver_avatar_url ? { uri: offer.driver_avatar_url } : require('../assets/default-avatar.png')} 
                    style={styles.driverAvatar}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
                />
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{offer.driver_name}</Text>
                    <Text style={styles.driverCarText}>{offer.car_make} {offer.car_model}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
            {offer.driver_comment && <Text style={styles.driverMessageText}>"{offer.driver_comment}"</Text>}
            <View style={styles.driverActionRow}>
                <Text style={styles.driverPrice}>{displayPrice}</Text>
                <TouchableOpacity style={styles.chooseDriverButton} onPress={onAccept} disabled={isAccepting}>
                    {isAccepting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.chooseDriverButtonText}>{t('transferDetail.acceptOffer', 'Прийняти')}</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ConfirmedDriverCard = ({ driver, onChangeDriver }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    return (
        <View style={[styles.driverCard, styles.confirmedDriverCard]}>
            <View style={styles.driverCardHeader}>
                <Image 
                    source={driver.driver_avatar_url ? { uri: driver.driver_avatar_url } : require('../assets/default-avatar.png')} 
                    style={styles.driverAvatar} 
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
                />
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.driver_name}</Text>
                    <Text style={styles.driverCarText}>{driver.car_make} {driver.car_model}</Text>
                </View>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <TouchableOpacity style={styles.changeDriverButton} onPress={onChangeDriver}>
                <Text style={styles.changeDriverButtonText}>{t('transferDetail.changeDriver', 'Змінити водія')}</Text>
            </TouchableOpacity>
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
  const [hiddenDriverId, setHiddenDriverId] = useState(null);

  const MAPS_API_KEY = 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo'; // Замініть на ваш ключ

  // ✅ ПОЧАТОК ЗМІН: Виправлення помилки при швидкому виході з екрана
  useEffect(() => {
    let timerId = null; // Зберігаємо ID таймера

    if (routeCoordinates.length > 1 && mapViewRef.current) {
        // Запускаємо таймер і зберігаємо його ID
        timerId = setTimeout(() => {
            // Додаткова перевірка, що посилання на карту все ще існує
            if (mapViewRef.current) {
                mapViewRef.current.fitToCoordinates(routeCoordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }, 500);
    }

    // Функція очищення, яка спрацює, коли компонент демонтується
    return () => {
        // Якщо таймер було запущено, скасовуємо його
        if (timerId) {
            clearTimeout(timerId);
        }
    };
  }, [routeCoordinates]);
  // ✅ КІНЕЦЬ ЗМІН

  const fetchData = useCallback(async () => {
    setHiddenDriverId(null);
    try {
      const { data, error } = await supabase.rpc('get_transfer_details', { p_transfer_id: transferId }).single();
      if (error) throw error;
      
      if (data) {
        setTransferData(data);
        if (data.status === 'pending' || data.status === 'accepted') {
            const { data: offersData, error: offersError } = await supabase.rpc('get_transfer_offers', { p_transfer_id: transferId });
            if (offersError) throw offersError;
            setOffers(offersData || []);
        }
        if (data.status === 'pending') {
            await supabase.rpc('mark_offers_as_read', { p_transfer_id: transferId });
        }
        fetchRoute(data.from_location, data.to_location);
      }
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setLoading(false); }
  }, [transferId, t, i18n.language]);

  useEffect(() => { 
    setLoading(true);
    fetchData(); 
  }, [fetchData]);

  const handleAcceptOffer = async (offer) => {
      setIsAccepting(true);
      try {
          const { error } = await supabase.functions.invoke('accept-offer-and-notify', { body: { offer_id: offer.offer_id, transfer_id: transferId, driver_id: offer.driver_id } });
          if (error) throw error;
          Alert.alert(t('common.success'), t('transferDetail.driverConfirmed'));
          fetchData();
      } catch (error) { Alert.alert(t('common.error'), error.message); } 
      finally { setIsAccepting(false); }
  };
  
  const handleChangeDriver = async () => {
      Alert.alert(
        t('transferDetail.changeDriverConfirmTitle'),
        t('transferDetail.changeDriverConfirmText'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                const driverToHideId = transferData?.accepted_driver_details?.driver_id;
                if (driverToHideId) {
                    setHiddenDriverId(driverToHideId);
                }
                const { error } = await supabase.rpc('reset_transfer_to_pending', { p_transfer_id: transferId });
                if (error) throw error;
                fetchData();
              } catch (error) {
                Alert.alert(t('common.error'), error.message);
              }
            }
          }
        ]
      );
  };

  const fetchRoute = async (origin, destination) => {
    if (!origin || !destination) return;
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}&language=${i18n.language}`;
      const response = await fetch(url);
      const json = await response.json();
      if (json.routes?.length > 0) {
        const route = json.routes[0];
        const points = polyline.decode(route.overview_polyline.points);
        const coords = points.map(point => ({ latitude: point[0], longitude: point[1] }));
        setRouteCoordinates(coords);
        if (route.legs?.length > 0) { setRouteInfo({ distance: route.legs[0].distance.text, duration: route.legs[0].duration.text }); }
      } else { console.warn('Route not found:', json.status); }
    } catch (error) { console.error("Error fetching route:", error); }
  };

  const handleCancelTransfer = async () => { Alert.alert(t('transferDetail.cancelConfirmTitle'), t('transferDetail.cancelConfirmText'), [{ text: t('common.no'), style: 'cancel' }, { text: t('common.yes'), style: 'destructive', onPress: async () => { try { const { error } = await supabase.from('transfers').update({ status: 'cancelled' }).eq('id', transferId); if (error) throw error; Alert.alert(t('common.success'), t('transferDetail.cancelledSuccess')); navigation.goBack(); } catch (error) { Alert.alert(t('common.error'), error.message); } } }]); };

  const visibleOffers = useMemo(() => {
    if (!offers) return [];
    return offers.filter(offer => {
        if (offer.driver_id === hiddenDriverId) {
            return false;
        }
        if (transferData?.status === 'accepted' && offer.driver_id === transferData.accepted_driver_details?.driver_id) {
            return false;
        }
        return true;
    });
  }, [offers, transferData, hiddenDriverId]);

  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('transferDetail.title')}</Text><Logo width={40} height={40} /></View>
            <View style={styles.centeredContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        </SafeAreaView>
    );
  }

  if (!transferData) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('transferDetail.title')}</Text><Logo width={40} height={40} /></View>
            <View style={styles.centeredContainer}><Text style={styles.sectionTitle}>{t('transferDetail.notFound')}</Text></View>
        </SafeAreaView>
    );
  }
  
  const finalPrice = transferData.accepted_driver_details?.price;
  const finalCurrency = transferData.accepted_driver_details?.currency;



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('transferDetail.title')}</Text><Logo width={40} height={40} /></View>
      {(transferData?.status === 'completed' || transferData?.status === 'cancelled') && (<View style={[styles.statusBanner, transferData.status === 'completed' ? styles.completedBanner : styles.cancelledBanner]}><Ionicons name={transferData.status === 'completed' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={24} color={transferData.status === 'completed' ? '#2E7D32' : '#D32F2F'} /><Text style={[styles.statusBannerText, transferData.status === 'completed' ? styles.completedBannerText : styles.cancelledBannerText]}>{t(`transferDetail.${transferData.status}`)}</Text></View>)}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 500 }}>
            <View style={styles.userInfoSection}>
                <Image 
                    source={transferData?.passenger_avatar_url ? { uri: transferData.passenger_avatar_url } : require('../assets/default-avatar.png')} 
                    style={styles.userAvatar}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
                />
                <Text style={styles.userName}>{transferData?.passenger_name}</Text>
            </View>

            <View style={styles.infoCard}>
                <InfoRow 
                  icon={transferData?.direction === 'from_airport' ? 'airplane-outline' : 'location-outline'} 
                  label={t('transferDetail.from')} 
                  value={transferData?.from_location} 
                  colors={colors} 
                />
                <View style={styles.dottedLine} />
                <InfoRow 
                  icon={transferData?.direction === 'to_airport' ? 'airplane-outline' : 'location-outline'} 
                  label={t('transferDetail.to')} 
                  value={transferData?.to_location} 
                  colors={colors} 
                />
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('transferDetail.detailsTitle')}</Text>
                <View style={styles.detailsGrid}>
                  <DetailItem icon="calendar-outline" value={moment(transferData?.transfer_datetime).format('D MMM')} colors={colors} />
                  <DetailItem icon="time-outline" value={moment(transferData?.transfer_datetime).format('HH:mm')} colors={colors} />
                  <DetailItem icon="barcode-outline" value={transferData?.flight_number} label={t('transferDetail.flightNumber')} colors={colors} />
                </View>
                <View style={styles.divider} />
                
                {/* <InfoRow value={passengerDetails} colors={colors} /> */}
                
    <View style={styles.passengerDetailsContainer}>
      {transferData.adults_count > 0 && (
        <View style={styles.passengerDetailItem}>
          <Ionicons name="people-outline" size={20} color={colors.text} />
          <Text style={styles.passengerDetailText}>
            {`${transferData.adults_count} дор.`}
          </Text>
        </View>
      )}
      {transferData.children_count > 0 && (
        <View style={styles.passengerDetailItem}>
          <Ionicons name="person-outline" size={20} color={colors.text} />
          <Text style={styles.passengerDetailText}>
            {`${transferData.children_count} дит.`}
          </Text>
        </View>
      )}
      {transferData.infants_count > 0 && (
        <View style={styles.passengerDetailItem}>
          <Ionicons name="happy-outline" size={20} color={colors.text} />
          <Text style={styles.passengerDetailText}>
            {`${transferData.infants_count} нем.`}
          </Text>
        </View>
      )}
    </View>
  
                <View style={styles.divider} />
                <View style={styles.detailsGrid}>
                    <DetailItem icon="briefcase-outline" value={transferData?.luggage_info} label={t('transferDetail.luggage')} colors={colors} />
                    <DetailItem icon="paw-outline" value={transferData?.with_pet ? t('common.yes') : null} label={t('transferDetail.withPet')} colors={colors} />
                    <DetailItem icon="person-add-outline" value={transferData?.meet_with_sign ? t('common.yes') : null} label={t('home.meetWithSign')} colors={colors} />
                    <DetailItem 
                        icon="car-sport-outline" 
                        value={transferData?.transfer_type === 'individual' ? 'індив.' : t(`transferTypes.${transferData?.transfer_type}`)} 
                        label={t('transferDetail.transferType')} 
                        colors={colors}
                    />
                </View>
                 {(transferData.status === 'accepted' || transferData.status === 'completed') && finalPrice && (
                  <>
                    <View style={styles.divider} />
                    <InfoRow 
                      icon="cash-outline" 
                      label={t('transferDetail.finalPrice')} 
                      value={`${finalPrice} ${finalCurrency || t('common.currency_uah')}`} 
                      colors={colors}
                      valueStyle={{ color: colors.primary, fontWeight: 'bold' }}
                    />
                  </>
                )}
            </View>

            {transferData?.passenger_comment && (<View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.clientComment')}</Text><Text style={styles.commentText}>"{transferData.passenger_comment}"</Text></View>)}
            
            <View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.route')}</Text><View style={styles.mapContainer}><MapView ref={mapViewRef} style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE}><Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} /></MapView></View>{routeInfo && (<View style={styles.routeInfoContainer}><View style={styles.routeInfoItem}><Ionicons name="speedometer-outline" size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{routeInfo.distance}</Text></View><View style={styles.routeInfoItem}><Ionicons name={transferData?.direction === 'from_airport' ? 'airplane-outline' : 'business-outline'} size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{transferData?.direction === 'from_airport' ? t('transferDetail.fromAirport') : t('transferDetail.toAirport')}</Text></View></View>)}</View>

            {transferData?.status === 'accepted' && transferData?.accepted_driver_details && (<View style={styles.offersSection}><Text style={styles.sectionTitle}>{t('transferDetail.chosenDriver')}</Text><ConfirmedDriverCard driver={transferData.accepted_driver_details} onChangeDriver={handleChangeDriver} /></View>)}
            
            {visibleOffers.length > 0 && (
                <View style={styles.offersSection}>
                    <Text style={styles.sectionTitle}>
                        {transferData.status === 'pending' ? t('transferDetail.driverOffers') : t('transferDetail.otherOffers')}
                    </Text>
                    {visibleOffers.map(offer => ( 
                        <DriverOfferCard key={offer.offer_id} offer={offer} onAccept={() => handleAcceptOffer(offer)} isAccepting={isAccepting} /> 
                    ))}
                </View>
            )}
            
            {transferData?.status === 'pending' && visibleOffers.length === 0 && (<View style={styles.offersSection}><Text style={styles.sectionTitle}>{t('transferDetail.driverOffers')}</Text><Text style={styles.noOffersText}>{t('transferDetail.noOffers')}</Text></View>)}
            {transferData?.status !== 'completed' && transferData?.status !== 'cancelled' && (<TouchableOpacity style={styles.cancelButton} onPress={handleCancelTransfer}><Text style={styles.cancelButtonText}>{t('transferDetail.cancelTransfer')}</Text><Ionicons name="close-circle-outline" size={20} color="#fff" /></TouchableOpacity>)}
        </MotiView>
      </ScrollView>

    </SafeAreaView>
  );
}
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,  borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 16, marginTop: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
    completedBanner: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
    cancelledBanner: { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' },
    statusBannerText: { fontSize: 16, fontWeight: 'bold' },
    completedBannerText: { color: '#2E7D32' },
    cancelledBannerText: { color: '#D32F2F' },
    scrollContent: { paddingBottom: 40 },
    userInfoSection: { alignItems: 'center', paddingTop: 16 },
    userAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12, backgroundColor: colors.card },
    userName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    infoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 16 },
    infoRowContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    infoRowIcon: { marginRight: 16, width: 24 },
    infoRowLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 2 },
    infoRowValue: { fontSize: 16, color: colors.text, fontWeight: '500', flexShrink: 1 },
    dottedLine: { height: 16, width: 1, backgroundColor: colors.border, marginVertical: 4, marginLeft: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    detailsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start',  },
    detailItem: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
    detailValue: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    detailLabel: { color: colors.secondaryText, fontSize: 12, marginTop: 2, textAlign: 'center' },
    passengerDetailsContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', marginVertical: 8 , },
    passengerDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    passengerDetailText: { color: colors.text, fontSize: 14, fontWeight: '500' },
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
    driverCardHeader: { flexDirection: 'row', alignItems: 'center' },
    driverAvatar: { width: 50, height: 50, borderRadius: 25 },
    driverInfo: { flex: 1, marginLeft: 12 },
    driverName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    driverCarText: { color: colors.secondaryText, fontSize: 14, marginTop: 4 },
    driverMessageText: { color: colors.text, fontStyle: 'italic', marginVertical: 12 },
    driverActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 8 },
    chooseDriverButton: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
    chooseDriverButtonText: { color: '#fff', fontWeight: 'bold' },
    driverPrice: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    confirmedDriverCard: { borderColor: colors.primary, borderWidth: 1.5 },
    changeDriverButton: { backgroundColor: `${colors.primary}20`, padding: 12, borderRadius: 10, marginTop: 12, alignItems: 'center' },
    changeDriverButtonText: { color: colors.primary, fontWeight: 'bold' },
});