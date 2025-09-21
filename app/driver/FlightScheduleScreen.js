import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, SafeAreaView, Platform, Pressable } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import { MotiView } from 'moti';
import { Image } from 'expo-image';

const CITIES = [
    { iata: 'LWO', flag: '🇺🇦', name: { uk: 'Львів', en: 'Lviv', ro: 'Liov' } },
    { iata: 'KBP', flag: '🇺🇦', name: { uk: 'Київ (Бориспіль)', en: 'Kyiv (Boryspil)', ro: 'Kiev (Borispil)' } },
    { iata: 'WAW', flag: '🇵🇱', name: { uk: 'Варшава (Шопен)', en: 'Warsaw (Chopin)', ro: 'Varșovia (Chopin)' } },
    { iata: 'KRK', flag: '🇵🇱', name: { uk: 'Краків (Баліце)', en: 'Krakow (Balice)', ro: 'Cracovia (Balice)' } },
    { iata: 'GDN', flag: '🇵🇱', name: { uk: 'Гданськ', en: 'Gdańsk', ro: 'Gdańsk' } },
    { iata: 'BER', flag: '🇩🇪', name: { uk: 'Берлін (Бранденбург)', en: 'Berlin (Brandenburg)', ro: 'Berlin (Brandenburg)' } },
    { iata: 'MUC', flag: '🇩🇪', name: { uk: 'Мюнхен', en: 'Munich', ro: 'München' } },
    { iata: 'FRA', flag: '🇩🇪', name: { uk: 'Франкфурт', en: 'Frankfurt', ro: 'Frankfurt' } },
    { iata: 'FCO', flag: '🇮🇹', name: { uk: 'Рим (Ф\'юмічіно)', en: 'Rome (Fiumicino)', ro: 'Roma (Fiumicino)' } },
    { iata: 'MXP', flag: '🇮🇹', name: { uk: 'Мілан (Мальпенса)', en: 'Milan (Malpensa)', ro: 'Milano (Malpensa)' } },
    { iata: 'VCE', flag: '🇮🇹', name: { uk: 'Венеція', en: 'Venice', ro: 'Veneția' } },
    { iata: 'MAD', flag: '🇪🇸', name: { uk: 'Мадрид (Барахас)', en: 'Madrid (Barajas)', ro: 'Madrid (Barajas)' } },
    { iata: 'BCN', flag: '🇪🇸', name: { uk: 'Барселона', en: 'Barcelona', ro: 'Barcelona' } },
    { iata: 'CDG', flag: '🇫🇷', name: { uk: 'Париж (Шарль де Голль)', en: 'Paris (Charles de Gaulle)', ro: 'Paris (Charles de Gaulle)' } },
    { iata: 'LHR', flag: '🇬🇧', name: { uk: 'Лондон (Хітроу)', en: 'London (Heathrow)', ro: 'Londra (Heathrow)' } },
    { iata: 'AMS', flag: '🇳🇱', name: { uk: 'Амстердам (Схіпгол)', en: 'Amsterdam (Schiphol)', ro: 'Amsterdam (Schiphol)' } },
    { iata: 'LIS', flag: '🇵🇹', name: { uk: 'Лісабон', en: 'Lisbon', ro: 'Lisabona' } },
    { iata: 'ATH', flag: '🇬🇷', name: { uk: 'Афіни', en: 'Athens', ro: 'Atena' } },
    { iata: 'VIE', flag: '🇦🇹', name: { uk: 'Відень', en: 'Vienna', ro: 'Viena' } },
    { iata: 'BUD', flag: '🇭🇺', name: { uk: 'Будапешт', en: 'Budapest', ro: 'Budapesta' } },
    { iata: 'OTP', flag: '🇷🇴', name: { uk: 'Бухарест (Отопені)', en: 'Bucharest (Otopeni)', ro: 'București (Otopeni)' } },
    { iata: 'PRG', flag: '🇨🇿', name: { uk: 'Прага', en: 'Prague', ro: 'Praga' } },
    { iata: 'IST', flag: '🇹🇷', name: { uk: 'Стамбул (IST)', en: 'Istanbul (IST)', ro: 'Istanbul (IST)' } },
];

// ✨ 1. КЛЮЧОВЕ ВИПРАВЛЕННЯ: Робимо параметр `theme` необов'язковим, щоб уникнути помилок
const getStyles = (colors, theme = {}) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background ,         paddingTop: Platform.OS === 'android' ? 25 : 0 
},
    headerContainer: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 25 : 16, paddingBottom: 16, borderBottomWidth: 1 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 15, marginTop: 4, color: colors.secondaryText },
    filtersContainer: { padding: 16 },
    dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: colors.card, ...theme.shadow },
    routeSelectors: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    selectorContainer: { flex: 1 },
    selectorLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginLeft: 4, color: colors.secondaryText },
    selectorButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: colors.card, ...theme.shadow },
    swapButton: { paddingHorizontal: 8, alignSelf: 'center', marginTop: 24 },
    searchButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    searchButtonText: { fontSize: 18, fontWeight: 'bold' },
    filterText: { marginLeft: 8, fontSize: 15, fontWeight: '600', color: colors.text },
    flagText: { fontSize: 24 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 50 },
    emptyText: { marginTop: 15, fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.secondaryText },
    emptySubtext: { marginTop: 8, fontSize: 15, textAlign: 'center', color: colors.secondaryText },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { maxHeight: '70%', borderTopRightRadius: 20, borderTopLeftRadius: 20, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemText: { fontSize: 18, textAlign: 'center' },
    closeButton: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeButtonText: { fontSize: 18, fontWeight: 'bold' },
    flightItem: { borderRadius: 20, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, ...theme.shadow },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    airlineInfo: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
    flightCode: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    airlineName: { fontSize: 14, marginLeft: 5, flexShrink: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationColumn: { flex: 1, alignItems: 'center' },
    timeLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase' },
    timeText: { fontSize: 20, fontWeight: '600' },
    airportName: { fontSize: 13, marginTop: 4, textAlign: 'center' },
    routeLine: { flex: 2, alignItems: 'center' },
    dateText: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    line: { height: 1, width: '100%' },
});

const SelectionModal = memo(({ visible, onClose, onSelect, data, title, renderItem }) => {
    // ✨ 2. КЛЮЧОВЕ ВИПРАВЛЕННЯ: Отримуємо і `colors`, і `theme`
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.iata || item.toISOString()}
                        renderItem={({ item }) => renderItem(item, onSelect)}
                    />
                    <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.card }]} onPress={onClose}>
                        <Text style={[styles.closeButtonText, { color: colors.primary }]}>{t('common.close', 'Закрити')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const CitySelector = memo(({ label, cityIata, onPress }) => {
    // ✨ 3. КЛЮЧОВЕ ВИПРАВЛЕННЯ: Отримуємо `colors` і `theme` з хука, а не з пропсів
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const { i18n } = useTranslation();
    const city = CITIES.find(c => c.iata === cityIata);
    const cityName = city?.name[i18n.language] || city?.name['uk'];

    return (
        <View style={styles.selectorContainer}>
            <Text style={[styles.selectorLabel]}>{label}</Text>
            <TouchableOpacity style={[styles.selectorButton]} onPress={onPress}>
                <Text style={styles.flagText}>{city?.flag}</Text>
                <Text style={[styles.filterText]} numberOfLines={1}>{cityName || 'Виберіть місто'}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
    );
});

const FlightScheduleScreen = () => {
    const { colors, theme } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = getStyles(colors, theme);

    const [origin, setOrigin] = useState('LWO');
    const [destination, setDestination] = useState('WAW');
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isOriginModalVisible, setOriginModalVisible] = useState(false);
    const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);
    const [flights, setFlights] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const locale = i18n.language === 'en' ? 'en-gb' : i18n.language;
        moment.locale(locale);

        const today = new Date();
        const nextSevenDays = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(today.getDate() + i);
            return date;
        });
        setDates(nextSevenDays);
        setSelectedDate(nextSevenDays[0]);
    }, [i18n.language]);

    const handleSearch = useCallback(async () => {
        if (!origin || !destination || !selectedDate) {
            setError(t('errors.fillAllFields'));
            return;
        }
        setIsLoading(true);
        setError(null);
        setFlights([]);
        try {
            const flightDate = selectedDate.toISOString().split('T')[0];
            const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                body: { originIata: origin, destinationIata: destination, flightDate },
            });
            if (funcError) throw funcError;
            if (data && data.error) throw new Error(data.error.message || t('errors.apiError'));
            setFlights(Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [origin, destination, selectedDate, t]);
    
    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return { time: '--:--', day: '' };
        const date = moment(dateString);
        if (!date.isValid()) return { time: '--:--', day: '' };
        const time = date.format('HH:mm');
        const day = date.format('D MMM');
        return { time, day };
    }, []);

    const renderFlight = useCallback(({ item, index }) => {
        const { time: departureTime, day: departureDay } = formatDateTime(item.departure?.scheduled);
        const { time: arrivalTime } = formatDateTime(item.arrival?.scheduled);
        return (
            <MotiView 
                from={{ opacity: 0, translateY: 50 }} 
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 350, delay: index * 100 }}
            >
                <View style={[styles.flightItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.topRow}><View style={styles.airlineInfo}><Ionicons name="airplane-sharp" size={20} color={colors.primary} /><Text style={[styles.flightCode, { color: colors.primary }]}>{item.flight?.iata}</Text><Text style={[styles.airlineName, { color: colors.secondaryText }]}>{item.airline?.name}</Text></View><View style={[styles.statusBadge, { backgroundColor: colors.primary }]}><Text style={styles.statusText}>{t(`flights.status.${item.flight_status}`, item.flight_status)}</Text></View></View>
                    <View style={styles.routeRow}><View style={styles.locationColumn}><Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.departure', 'Виліт')}</Text><Text style={[styles.timeText, { color: colors.text }]}>{departureTime}</Text><Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.departure?.airport}</Text></View><View style={styles.routeLine}><Text style={[styles.dateText, { color: colors.text }]}>{departureDay}</Text><View style={[styles.line, { backgroundColor: colors.border }]} /><Ionicons name="airplane" size={16} color={colors.secondaryText} /></View><View style={styles.locationColumn}><Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.arrival', 'Приліт')}</Text><Text style={[styles.timeText, { color: colors.text }]}>{arrivalTime}</Text><Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.arrival?.airport}</Text></View></View>
                </View>
            </MotiView>
        );
    }, [colors, theme, t, formatDateTime]);
    
    const renderDateItem = useCallback((date, onSelect) => (
        <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(date)}>
            <Text style={[styles.modalItemText, { color: colors.text }]}>{moment(date).format('dddd, D MMMM')}</Text>
        </TouchableOpacity>
    ), [colors]);
    
    const renderCityItem = useCallback((city, onSelect) => (
        <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(city.iata)}>
            <Text style={[styles.modalItemText, { color: colors.text }]}>{city.flag} {city.name[i18n.language] || city.name['uk']}</Text>
        </TouchableOpacity>
    ), [colors, i18n.language]);

    return (
        <SafeAreaView style={[styles.container]}>
            <View style={[styles.headerContainer]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                   <Ionicons name="airplane-outline" size={28} color={colors.text} />
                   <Text style={[styles.title]}>{t('flights.title', 'Розклад рейсів')}</Text>
                </View>
                <Text style={[styles.subtitle]}>{t('flights.subtitle')}</Text>
            </View>

            <FlatList
                ListHeaderComponent={
                    <View style={styles.filtersContainer}>
                        <TouchableOpacity style={[styles.dateButton]} onPress={() => setDateModalVisible(true)}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={[styles.filterText]}>{selectedDate ? moment(selectedDate).format('D MMMM') : ''}</Text>
                        </TouchableOpacity>
                        <View style={styles.routeSelectors}>
                            <CitySelector label={t('flights.from', 'Звідки')} cityIata={origin} onPress={() => setOriginModalVisible(true)} />
                            <TouchableOpacity style={styles.swapButton} onPress={() => { setOrigin(destination); setDestination(origin); }}>
                                <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <CitySelector label={t('flights.to', 'Куди')} cityIata={destination} onPress={() => setDestinationModalVisible(true)} />
                        </View>
                        <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                            <Text style={[styles.searchButtonText, { color: '#fff' }]}>{t('flights.search', 'Знайти рейси')}</Text>
                        </TouchableOpacity>
                    </View>
                }
                data={flights}
                renderItem={renderFlight}
                keyExtractor={(item, index) => (item.flight?.iata || index) + item.departure?.scheduled + index}
                ListEmptyComponent={
                    isLoading ? <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />
                    : error ? (
                        <View style={styles.emptyContainer}><Ionicons name="cloud-offline-outline" size={50} color={colors.secondaryText} /><Text style={styles.emptyText}>{t('errors.flightLoadError', 'Не вдалося завантажити дані')}</Text><Text style={styles.emptySubtext}>{error}</Text></View>
                    ) : (
                        <View style={styles.emptyContainer}><Ionicons name="airplane-outline" size={50} color={colors.secondaryText} /><Text style={styles.emptyText}>{t('flights.noResults', 'Рейсів не знайдено.')}</Text><Text style={styles.emptySubtext}>{t('flights.tryChangingParams')}</Text></View>
                    )
                }
                contentContainerStyle={{ flexGrow: 1, paddingTop: 10, paddingBottom: 20 }}
            />
            
            <SelectionModal visible={isDateModalVisible} onClose={() => setDateModalVisible(false)} onSelect={(date) => { setSelectedDate(date); setDateModalVisible(false); }} data={dates} title={t('flights.selectDate', 'Виберіть дату')} renderItem={renderDateItem} />
            <SelectionModal visible={isOriginModalVisible} onClose={() => setOriginModalVisible(false)} onSelect={(iata) => { setOrigin(iata); setOriginModalVisible(false); }} data={CITIES} title={t('flights.selectOriginAirport', 'Виберіть аеропорт вильоту')} renderItem={renderCityItem} />
            <SelectionModal visible={isDestinationModalVisible} onClose={() => setDestinationModalVisible(false)} onSelect={(iata) => { setDestination(iata); setDestinationModalVisible(false); }} data={CITIES} title={t('flights.selectDestAirport', 'Виберіть аеропорт призначення')} renderItem={renderCityItem} />
        </SafeAreaView>
    );
}

export default memo(FlightScheduleScreen);

