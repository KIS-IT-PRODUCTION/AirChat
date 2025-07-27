import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTheme } from './ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker } from 'react-native-maps';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';

// Використовуємо більш надійну бібліотеку для розшифровки маршруту
import polyline from '@mapbox/polyline';

// --- ІМІТАЦІЯ БАЗИ ДАНИХ (з більш точними адресами для карт) ---
const TRANSFERS_DATABASE = {
  '1': { status: 'driver_selected', details: { id: '1', user: { name: 'Мазничка Артур Ігорович', avatar: 'https://i.pravatar.cc/150?u=artur' }, from: 'Аеропорт Шопен, Варшава, Польща', to: 'Львів, Площа Ринок, Україна', date: '17 липня', time: '14:30', passengers: 2, luggage: '1 валіза', withPet: false, transferType: 'Індивідуальний', comment: 'Буду вчасно.'}, chosenDriverId: 'd1', driverOffers: [{ id: 'd1', name: 'Артур І.', avatar: 'https://i.pravatar.cc/150?u=driver1', rating: 5, reviews: 127, car: 'Renault Trafic', message: 'Добрий день, готовий Вас взяти.', price: 3800 }] },
  '2': { status: 'scheduled', details: { id: '2', user: { name: 'Мазничка Артур Ігорович', avatar: 'https://i.pravatar.cc/150?u=artur' }, from: 'Краків, Польща', to: 'Львів, Україна', date: '18 липня', time: '14:30', passengers: 6, luggage: '3 валізи середнього розміру', withPet: true, transferType: 'Груповий', comment: 'Під’їхати за нами з іншого боку, також мати в наявності дитяче крісло.' }, driverOffers: [{ id: 'd1', name: 'Артур І.', avatar: 'https://i.pravatar.cc/150?u=driver1', rating: 5, reviews: 127, car: 'Renault Trafic', message: 'Добрий день, готовий Вас взяти.', price: 3800 }, { id: 'd2', name: 'Jake I.', avatar: 'https://i.pravatar.cc/150?u=driver2', rating: 4, reviews: 4, car: 'Mercedes Sprinter', message: 'Вітаю вас! Є можливість взяти ваших пасажирів', price: 4100 }] },
  '3': { status: 'completed', details: { id: '3', user: { name: 'Мазничка Артур Ігорович', avatar: 'https://i.pravatar.cc/150?u=artur' }, from: 'Аеропорт Шарль де Голль, Париж, Франція', to: 'Чернівці, Україна', date: '14 липня', time: '10:20', passengers: 4, luggage: '2 валізи', withPet: false, transferType: 'Індивідуальний', comment: 'Дякую за поїздку!'}, chosenDriverId: 'd3', driverOffers: [{ id: 'd3', name: 'Olexsandr T.', avatar: 'https://i.pravatar.cc/150?u=driver3', rating: 3.5, reviews: 2, car: 'Renault Master', message: 'Добрий вечір, хотів би обговорити', price: 3999 }] }
};

// --- Допоміжні компоненти ---

const StarRating = ({ rating }) => {
  let stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={16}
        color="#FFC107"
      />
    );
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
};

const DriverOfferCard = ({ driver, colors, isConfirmed = false }) => {
    const styles = getStyles(colors);
    return(
        <View style={[styles.driverCard, isConfirmed && styles.confirmedDriverCard]}>
            <View style={styles.driverCardHeader}>
                <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
                <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <View style={styles.driverRating}>
                        <StarRating rating={driver.rating} />
                        <Text style={styles.driverReviews}>{driver.reviews} відгуків</Text>
                    </View>
                    <View style={styles.driverCar}>
                        <Ionicons name="car-sport-outline" size={16} color={colors.secondaryText} />
                        <Text style={styles.driverCarText}>{driver.car}</Text>
                    </View>
                </View>
                {!isConfirmed && <Ionicons name="chevron-forward-outline" size={24} color={colors.secondaryText} />}
            </View>
            <View style={styles.driverMessageContainer}>
                <Text style={styles.driverMessageText}>{driver.message}</Text>
            </View>
            {!isConfirmed && (
                <View style={styles.driverActionRow}>
                    <TouchableOpacity style={styles.chooseDriverButton}>
                        <Text style={styles.chooseDriverButtonText}>Обрати цього водія</Text>
                    </TouchableOpacity>
                    <Text style={styles.driverPrice}>{driver.price} грн</Text>
                </View>
            )}
        </View>
    );
};

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


// --- ОСНОВНИЙ КОМПОНЕНТ ЕКРАНА ---
export default function TransferDetailScreen({ navigation, route }) {
  const { transferId, status } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { t, i18n } = useTranslation();
  const [transferData, setTransferData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapViewRef = useRef(null);
  
  // 👇👇👇 ВСТАВТЕ ВАШ КЛЮЧ СЮДИ 👇👇👇
  const Maps_API_KEY = 'AIzaSyAKwWqSjapoyrIBnAxnbByX6PMJZWGgzlo'; 
  // 👆👆👆 ВСТАВТЕ ВАШ КЛЮЧ СЮДИ 👆👆👆

  useEffect(() => {
    const data = TRANSFERS_DATABASE[transferId];
    setTransferData(data);

    if (data) {
      fetchRoute(data.details.from, data.details.to);
    }
  }, [transferId]);

  const fetchRoute = async (origin, destination) => {
 
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${Maps_API_KEY}`;
      const response = await fetch(url);
      const json = await response.json();

      if (json.routes && json.routes.length > 0) {
        const points = polyline.decode(json.routes[0].overview_polyline.points);
        const coords = points.map(point => ({ latitude: point[0], longitude: point[1] }));
        setRouteCoordinates(coords);
      } else {
        console.warn('Маршрут не знайдено:', json.status, json.error_message || '');
      }
    } catch (error) {
      console.error("Помилка при завантаженні маршруту:", error);
    }
  };

  const fitMapToRoute = () => {
    if (mapViewRef.current && routeCoordinates.length > 0) {
      mapViewRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const renderFooterContent = () => {
    if (!transferData) return null;

  switch (status) {
      case 'scheduled':
        return (
          <View style={styles.footerContainer}>
            <TouchableOpacity style={styles.cancelButton}><Text style={styles.cancelButtonText}>{t('transferDetail.cancelTransfer')}</Text><Ionicons name="close-circle-outline" size={20} color="#fff" /></TouchableOpacity>
            <Text style={styles.sectionTitle}>{t('transferDetail.driverOffers')}</Text>
            {transferData.driverOffers.map(driver => (
              <DriverOfferCard key={driver.id} driver={driver} colors={colors} />
            ))}
          </View>
        );
      case 'driver_selected':
        const chosenDriver = transferData.driverOffers.find(d => d.id === transferData.chosenDriverId);
        return (
          <View style={styles.footerContainer}>
            <TouchableOpacity style={styles.cancelButton}><Text style={styles.cancelButtonText}>{t('transferDetail.cancelTransfer')}</Text><Ionicons name="close-circle-outline" size={20} color="#fff" /></TouchableOpacity>
            <Text style={styles.sectionTitle}>{t('transferDetail.yourDriver')}</Text>
            {chosenDriver && <DriverOfferCard driver={chosenDriver} colors={colors} isConfirmed={true} />}
          </View>
        );
      case 'completed':
        const completedByDriver = transferData.driverOffers.find(d => d.id === transferData.chosenDriverId);
        return (
          <View style={styles.footerContainer}>
            <View style={styles.statusInfoBlock}><Text style={styles.statusInfoText}>{t('transferDetail.tripCompleted')}</Text></View>
            <Text style={styles.sectionTitle}>{t('transferDetail.yourDriver')}</Text>
            {completedByDriver && <DriverOfferCard driver={completedByDriver} colors={colors} isConfirmed={true} />}
          </View>
        );
      default:
        return null;
    }
  };
  
  if (!transferData) {
    return <View style={styles.container}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  
  const { details } = transferData;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
          <Text style={styles.title}>{t('transferDetail.title')}</Text>
          <Logo width={40} height={40} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.userInfoSection}>
            <Image source={{ uri: details.user.avatar }} style={styles.userAvatar} />
            <Text style={styles.userName}>{details.user.name}</Text>
        </View>

        <View style={styles.infoCard}>
            <InfoRow icon="airplane-outline" label={t('transferDetail.from')} value={details.from} colors={colors} />
            <View style={styles.dottedLine} />
            <InfoRow icon="location-outline" label={t('transferDetail.to')} value={details.to} colors={colors} />
        </View>
        
        <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('transferDetail.detailsTitle')}</Text>
            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}><Ionicons name="calendar-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{details.date}</Text></View>
                <View style={styles.detailItem}><Ionicons name="time-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{details.time}</Text></View>
                <View style={styles.detailItem}><Ionicons name="people-outline" size={24} color={colors.secondaryText}/><Text style={styles.detailValue}>{details.passengers} {t('transferDetail.passengers')}</Text></View>
            </View>
            <View style={styles.divider} />
            <InfoRow icon="briefcase-outline" label={t('transferDetail.luggage')} value={details.luggage} colors={colors} />
            {details.withPet && <InfoRow icon="paw-outline" label={t('transferDetail.withPet')} value={t('transferDetail.yes')} colors={colors} />}
            <InfoRow icon="car-sport-outline" label={t('transferDetail.transferType')} value={details.transferType} colors={colors} />
        </View>

        {details.comment && (
            <View style={styles.infoCard}>
                <Text style={styles.sectionTitle}>{t('transferDetail.clientComment')}</Text>
                <Text style={styles.commentText}>"{details.comment}"</Text>
            </View>
        )}
        
        <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('transferDetail.route')}</Text>
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapViewRef}
                    style={StyleSheet.absoluteFill}
                    onMapReady={fitMapToRoute}
                    initialRegion={{ latitude: 49.8397, longitude: 24.0297, latitudeDelta: 8.0, longitudeDelta: 8.0 }}
                >
                    {routeCoordinates.length > 0 && (
                        <>
                            <Marker coordinate={routeCoordinates[0]} title={t('transferDetail.start')}/>
                            <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title={t('transferDetail.finish')}/>
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor={colors.primary}
                                strokeWidth={5}
                            />
                        </>
                    )}
                </MapView>
            </View>
        </View>
        
        {renderFooterContent()}
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
    userAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
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
    footerContainer: { marginHorizontal: 16, marginTop: 16 },
    cancelButton: { flexDirection: 'row', backgroundColor: '#D32F2F', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
    cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    driverCard: { backgroundColor: colors.background, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    confirmedDriverCard: { borderColor: colors.primary, borderWidth: 1.5 },
    driverCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    driverAvatar: { width: 50, height: 50, borderRadius: 25 },
    driverInfo: { flex: 1, marginLeft: 12 },
    driverName: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    driverRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    driverReviews: { color: colors.secondaryText, fontSize: 12 },
    driverCar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    driverCarText: { color: colors.secondaryText, fontSize: 14 },
    driverMessageContainer: { backgroundColor: colors.card, borderRadius: 8, padding: 12, marginBottom: 12 },
    driverMessageText: { color: colors.text },
    driverActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chooseDriverButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    chooseDriverButtonText: { color: '#fff', fontWeight: 'bold' },
    driverPrice: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    statusInfoBlock: { backgroundColor: colors.card, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24},
    statusInfoText: { color: colors.text, fontSize: 16, fontWeight: 'bold'},
});