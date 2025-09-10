import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../provider/AuthContext';
import Logo from '../../assets/icon.svg';
import { useNavigation } from '@react-navigation/native';

// --- Допоміжні компоненти ---
const InfoRow = ({ icon, label, value, colors }) => {
  const styles = getStyles(colors);
  if (!value && value !== 0) return null;
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

const OtherDriverOffer = ({ offer, isChosen, onPress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const displayPrice = `${offer.price} ${offer.currency || 'UAH'}`;
    
    return (
        <TouchableOpacity 
            style={[styles.otherOfferRow, isChosen && styles.chosenOffer]} 
            onPress={onPress} 
            activeOpacity={0.7}
        >
            <Image
                source={offer.driver_avatar_url ? { uri: offer.driver_avatar_url } : require('../../assets/default-avatar.png')}
                style={styles.otherOfferAvatar}
                contentFit="cover"
                transition={300}
                cachePolicy="disk"
            />
            <Text style={[styles.otherOfferName, isChosen && styles.chosenOfferText]} numberOfLines={1}>{offer.driver_name}</Text>
            <Text style={[styles.otherOfferPrice, isChosen && styles.chosenOfferText]}>{displayPrice}</Text>
            {isChosen && <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
    );
};

const CURRENCIES = ['UAH', 'USD', 'EUR'];
const HEADER_HEIGHT = Platform.select({ ios: 85, android: 100 });

// --- ОСНОВНИЙ КОМПОНЕНТ ЕКРАНА ---
export default function DriverRequestDetailScreen({ navigation, route }) {
  const { transferId } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const mapViewRef = useRef(null);

  const [transferData, setTransferData] = useState(null);
  const [otherOffers, setOtherOffers] = useState([]);
  const [hasAlreadyOffered, setHasAlreadyOffered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  const [price, setPrice] = useState('');
  const [comment, setComment] = useState('');
  const [currency, setCurrency] = useState('UAH');

  const MAPS_API_KEY = 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo';

  useEffect(() => {
    const markAsViewed = async () => {
        if (transferId) {
            await supabase.rpc('mark_transfer_as_viewed', { p_transfer_id: transferId });
        }
    };
    markAsViewed();
  }, [transferId]);

  const fetchData = useCallback(async () => {
    if (!session?.user || !transferId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_driver_request_details', { p_transfer_id: transferId }).single();
      if (error) throw error;

      if (data) {
        setTransferData(data);
        const offers = data.other_offers || [];
        setOtherOffers(offers);
        setHasAlreadyOffered(offers.some(offer => offer.driver_id === session.user.id));
        fetchRoute(data.from_location, data.to_location);
      }
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  }, [transferId, session, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (mapViewRef.current && routeCoordinates.length > 1) {
      setTimeout(() => {
        mapViewRef.current.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [routeCoordinates]);

  const fetchRoute = async (origin, destination) => {
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
      }
    } catch (error) { console.error("Error fetching route:", error); }
  };

   const handleSubmitOffer = async () => {
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        Alert.alert(t('common.error'), t('driverOffer.priceRequired'));
        return;
    }
    setIsSubmitting(true);
    try {
        const { error } = await supabase.functions.invoke('submit-offer-and-notify', { body: { transfer_id: transferId, driver_id: session.user.id, price: parseFloat(price), driver_comment: comment, currency: currency }});
        if (error) throw error;
        Alert.alert(t('common.success'), t('driverOffer.offerSent'));
        fetchData();
    } catch (error) {
        Alert.alert(t('common.error'), error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('driverOffer.requestDetails')}</Text><Logo width={40} height={40} /></View>
            <View style={styles.centeredContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
        </SafeAreaView>
    );
  }

  if (!transferData) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.title}>{t('driverOffer.requestDetails')}</Text><Logo width={40} height={40} /></View>
            <View style={styles.centeredContainer}><Text style={styles.sectionTitle}>{t('transferDetail.notFound')}</Text></View>
        </SafeAreaView>
    );
  }

  const isRequestClosed = transferData?.status === 'accepted' || transferData?.status === 'completed' || transferData?.status === 'cancelled';
  const totalPassengers = (transferData?.adults_count || 0) + (transferData?.children_count || 0) + (transferData?.infants_count || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
        <Text style={styles.title}>{t('driverOffer.requestDetails')}</Text>
        <Logo width={40} height={40} />
      </View>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={HEADER_HEIGHT}
      >
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.userInfoSection}>
                <Image
                    source={transferData?.passenger_avatar_url ? { uri: transferData.passenger_avatar_url } : require('../../assets/default-avatar.png')}
                    style={styles.userAvatar}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="disk"
                />
                <Text style={styles.userName}>{transferData?.passenger_name || '...'}</Text>
                <Text style={styles.memberSince}>{t('driverHome.memberSince', { date: moment(transferData?.passenger_created_at).format('ll') })}</Text>
            </View>

            {/* ✨ ЗМІНИ ТУТ: Іконки тепер умовні */}
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
            {/* ✨ КІНЕЦЬ ЗМІН */}
            
            <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('transferDetail.detailsTitle')}</Text>
                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}><Ionicons name="calendar-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData?.transfer_datetime).format('D MMM')}</Text></View>
                    <View style={styles.detailItem}><Ionicons name="time-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{moment(transferData?.transfer_datetime).format('HH:mm')}</Text></View>
                    <View style={styles.detailItem}><Ionicons name="people-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{totalPassengers} {t('transferDetail.passengers')}</Text></View>
                </View>
                <View style={styles.divider} />
                <InfoRow icon="people-outline" label={t('passengers.adults')} value={transferData?.adults_count > 0 ? transferData?.adults_count : null} colors={colors} />
                <InfoRow icon="person-outline" label={t('passengers.children')} value={transferData?.children_count > 0 ? transferData.children_count : null} colors={colors} />
                <InfoRow icon="happy-outline" label={t('passengers.infants')} value={transferData?.infants_count > 0 ? transferData.infants_count : null} colors={colors} />
                <View style={styles.divider} />
                <InfoRow icon="briefcase-outline" label={t('transferDetail.luggage')} value={transferData?.luggage_info} colors={colors} />
                <InfoRow icon="paw-outline" label={t('transferDetail.withPet')} value={transferData?.with_pet ? t('transferDetail.yes') : null} colors={colors} />
                <InfoRow icon="person-add-outline" label={t('home.meetWithSign')} value={transferData?.meet_with_sign ? t('transferDetail.yes') : null} colors={colors} />
                <InfoRow icon="barcode-outline" label={t('transferDetail.flightNumber')} value={transferData?.flight_number} colors={colors} />
                <InfoRow icon="car-sport-outline" label={t('transferDetail.transferType')} value={t(`transferTypes.${transferData?.transfer_type}`, transferData?.transfer_type)} colors={colors} />
            </View>

            {transferData?.passenger_comment && (<View style={styles.infoCard}><Text style={styles.sectionTitle}>{t('transferDetail.clientComment')}</Text><Text style={styles.commentText}>"{transferData.passenger_comment}"</Text></View>)}
            
            <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('transferDetail.route')}</Text>
                <View style={styles.mapContainer}>
                    <MapView ref={mapViewRef} style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE}>
                        {routeCoordinates.length > 0 && (<><Marker coordinate={routeCoordinates[0]} /><Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} /><Polyline coordinates={routeCoordinates} strokeColor={colors.primary} strokeWidth={5} /></>)}
                    </MapView>
                </View>
                {routeInfo && (<View style={styles.routeInfoContainer}><View style={styles.routeInfoItem}><Ionicons name="speedometer-outline" size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{routeInfo.distance}</Text></View><View style={styles.routeInfoItem}><Ionicons name={transferData?.direction === 'from_airport' ? 'airplane-outline' : 'business-outline'} size={24} color={colors.secondaryText} /><Text style={styles.routeInfoText}>{transferData?.direction === 'from_airport' ? t('transferDetail.fromAirport') : t('transferDetail.toAirport')}</Text></View></View>)}
            </View>

            {otherOffers.length > 0 && (
                <View style={styles.infoCard}>
                    <Text style={styles.sectionTitle}>{t('driverOffer.otherOffersTitle')}</Text>
                    {otherOffers.map((offer, index) => (
                        <OtherDriverOffer 
                            key={index} 
                            offer={offer} 
                            isChosen={offer.driver_id === transferData?.accepted_driver_id}
                            onPress={() => navigation.navigate('PublicDriverProfile', { driverId: offer.driver_id })}
                        />
                    ))}
                </View>
            )}

            {!isRequestClosed && (
                <View style={styles.offerSection}>
                    <Text style={styles.sectionTitle}>{hasAlreadyOffered ? t('driverOffer.alreadyOffered') : t('driverOffer.yourOffer')}</Text>
                    {hasAlreadyOffered ? (
                        <View style={styles.alreadyOfferedContainer}><Ionicons name="checkmark-circle" size={24} color={colors.primary} /><Text style={styles.alreadyOfferedText}>{t('driverOffer.passengerNotified')}</Text></View>
                    ) : (
                        <>
                            <View style={styles.priceInputContainer}><TextInput style={styles.priceInput} placeholder={t('driverOffer.pricePlaceholder', '0')} placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={price} onChangeText={setPrice} /></View>
                            <View style={styles.currencySelector}>
                                {CURRENCIES.map((curr) => (<TouchableOpacity key={curr} style={[ styles.currencyButton, { backgroundColor: currency === curr ? colors.primary : colors.card, borderColor: colors.border }]} onPress={() => setCurrency(curr)}><Text style={[styles.currencyButtonText, { color: currency === curr ? '#fff' : colors.text }]}>{curr}</Text></TouchableOpacity>))}
                            </View>
                            <TextInput style={styles.commentInput} placeholder={t('driverOffer.commentPlaceholder')} placeholderTextColor={colors.secondaryText} value={comment} onChangeText={setComment} multiline />
                            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitOffer} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('driverOffer.submitButton')}</Text>}</TouchableOpacity>
                        </>
                    )}
                </View>
            )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Стилі залишаються без змін
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,  borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    scrollContent: { paddingBottom: 40 },
    userInfoSection: { alignItems: 'center', paddingTop: 16 },
    userAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, marginBottom: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    memberSince: { fontSize: 12, color: colors.secondaryText, marginTop: 4 },
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
    offerSection: { margin: 16, marginTop: 24 },
    priceInputContainer: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    priceInput: { color: colors.text, fontSize: 48, fontWeight: 'bold', paddingVertical: 16, textAlign: 'center' },
    currencySelector: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    currencyButton: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1 },
    currencyButtonText: { fontSize: 16, fontWeight: 'bold' },
    commentInput: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, height: 100, textAlignVertical: 'top', color: colors.text, fontSize: 16, marginBottom: 16 },
    submitButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    alreadyOfferedContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 12 },
    alreadyOfferedText: { flex: 1, color: colors.text, fontSize: 16 },
    otherOfferRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 8, borderRadius: 8 },
    otherOfferAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    otherOfferName: { flex: 1, color: colors.text, fontSize: 16 },
    otherOfferPrice: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    chosenOffer: { backgroundColor: `${colors.primary}20` },
    chosenOfferText: { color: colors.primary, fontWeight: 'bold' },
});