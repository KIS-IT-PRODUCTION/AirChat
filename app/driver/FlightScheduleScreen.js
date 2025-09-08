// app/FlightScheduleScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';

// ✨ РОЗШИРЕНА СТРУКТУРА ДАНИХ ДЛЯ КРАЇН ТА АЕРОПОРТІВ
const COUNTRIES = {
    'PL': { name: 'Польща', flag: '🇵🇱', airports: [{ name: 'Варшава (Шопен)', iata: 'WAW' }, { name: 'Краків (Баліце)', iata: 'KRK' }, { name: 'Гданськ', iata: 'GDN' }] },
    'DE': { name: 'Німеччина', flag: '🇩🇪', airports: [{ name: 'Берлін (Бранденбург)', iata: 'BER' }, { name: 'Мюнхен', iata: 'MUC' }, { name: 'Франкфурт', iata: 'FRA' }] },
    'IT': { name: 'Італія', flag: '🇮🇹', airports: [{ name: 'Рим (Ф\'юмічіно)', iata: 'FCO' }, { name: 'Мілан (Мальпенса)', iata: 'MXP' }, { name: 'Венеція', iata: 'VCE' }] },
    'ES': { name: 'Іспанія', flag: '🇪🇸', airports: [{ name: 'Мадрид (Барахас)', iata: 'MAD' }, { name: 'Барселона', iata: 'BCN' }, { name: 'Пальма-де-Майорка', iata: 'PMI' }] },
    'FR': { name: 'Франція', flag: '🇫🇷', airports: [{ name: 'Париж (Шарль де Голль)', iata: 'CDG' }, { name: 'Ніцца', iata: 'NCE' }, { name: 'Ліон', iata: 'LYS' }] },
    'GB': { name: 'Велика Британія', flag: '🇬🇧', airports: [{ name: 'Лондон (Хітроу)', iata: 'LHR' }, { name: 'Лондон (Гатвік)', iata: 'LGW' }, { name: 'Манчестер', iata: 'MAN' }] },
    'NL': { name: 'Нідерланди', flag: '🇳🇱', airports: [{ name: 'Амстердам (Схіпгол)', iata: 'AMS' }] },
    'PT': { name: 'Португалія', flag: '🇵🇹', airports: [{ name: 'Лісабон', iata: 'LIS' }, { name: 'Порту', iata: 'OPO' }] },
    'GR': { name: 'Греція', flag: '🇬🇷', airports: [{ name: 'Афіни', iata: 'ATH' }, { name: 'Іракліон', iata: 'HER' }] },
    'AT': { name: 'Австрія', flag: '🇦🇹', airports: [{ name: 'Відень', iata: 'VIE' }] },
    'HU': { name: 'Угорщина', flag: '🇭🇺', airports: [{ name: 'Будапешт', iata: 'BUD' }] },
        'UA': { name: 'Україна', flag: '🇺🇦', airports: [{ name: 'Львів', iata: 'LWO' }, { name: 'Київ (Бориспіль)', iata: 'KBP' }] },
    'RO': { name: 'Румунія', flag: '🇷🇴', airports: [{ name: 'Бухарест (Отопені)', iata: 'OTP' }] },
    'CZ': { name: 'Чехія', flag: '🇨🇿', airports: [{ name: 'Прага', iata: 'PRG' }] },
    'TR': { name: 'Туреччина', flag: '🇹🇷', airports: [{ name: 'Стамбул (IST)', iata: 'IST' }, { name: 'Анталія', iata: 'AYT' }] },
    
};

// --- Компонент модального вікна для вибору ---
const SelectionModal = ({ visible, onClose, onSelect, data, title, renderItem }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <FlatList
                        data={data}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => renderItem(item, onSelect)}
                    />
                    <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.card }]} onPress={onClose}>
                        <Text style={[styles.closeButtonText, { color: colors.primary }]}>{t('common.close', 'Закрити')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// Компонент для вибору аеропорту, щоб уникнути дублювання коду
const AirportSelector = ({ label, country, airport, onCountryPress, onAirportPress, colors }) => {
    const airportName = COUNTRIES[country]?.airports.find(a => a.iata === airport)?.name || 'Виберіть аеропорт';
    return (
        <View style={styles.selectorContainer}>
            <Text style={[styles.selectorLabel, { color: colors.secondaryText }]}>{label}</Text>
            <TouchableOpacity style={[styles.selectorButton, { backgroundColor: colors.card }]} onPress={onCountryPress}>
                <Text style={styles.flagText}>{COUNTRIES[country]?.flag}</Text>
                <Text style={[styles.filterText, { color: colors.text }]}>{COUNTRIES[country]?.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectorButton, { backgroundColor: colors.card }]} onPress={onAirportPress}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={[styles.filterText, { color: colors.text, flex: 1 }]} numberOfLines={1}>{airportName}</Text>
            </TouchableOpacity>
        </View>
    );
};


export default function FlightScheduleScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    // Стани для вильоту (origin) та призначення (destination)
    const [originCountry, setOriginCountry] = useState('UA');
    const [originAirport, setOriginAirport] = useState('LWO');
    const [destinationCountry, setDestinationCountry] = useState('PL');
    const [destinationAirport, setDestinationAirport] = useState('WAW');
    
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    
    // Стани для керування видимістю модальних вікон
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isOriginCountryModalVisible, setOriginCountryModalVisible] = useState(false);
    const [isOriginAirportModalVisible, setOriginAirportModalVisible] = useState(false);
    const [isDestinationCountryModalVisible, setDestinationCountryModalVisible] = useState(false);
    const [isDestinationAirportModalVisible, setDestinationAirportModalVisible] = useState(false);

    const [flights, setFlights] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Початково не завантажуємо
    const [error, setError] = useState(null);

    useEffect(() => {
        const today = new Date();
        const nextSevenDays = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(today.getDate() + i);
            return date;
        });
        setDates(nextSevenDays);
        setSelectedDate(nextSevenDays[0]);
    }, []);

    // Функція для пошуку рейсів, що викликається кнопкою
    const handleSearch = async () => {
        if (!originAirport || !destinationAirport || !selectedDate) {
            setError("Будь ласка, заповніть усі поля.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setFlights([]);
        try {
            const flightDate = selectedDate.toISOString().split('T')[0];
            
            // Виклик Edge Function з новими параметрами
            const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                body: { 
                    originIata: originAirport, 
                    destinationIata: destinationAirport, 
                    flightDate 
                },
            });

            if (funcError) throw funcError;
            if (data && data.error) throw new Error(data.error.message || t('errors.apiError'));
            if (data && Array.isArray(data.data)) {
                setFlights(data.data);
            } else {
                setFlights([]); // Якщо дані не прийшли, встановлюємо порожній масив
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const formatDateTime = (dateString) => {
        if (!dateString) return { time: '--:--', day: '' };
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { time: '--:--', day: '' };
        
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
        return { time, day };
    };

    const renderFlight = ({ item }) => {
        const { time: departureTime, day: departureDay } = formatDateTime(item.departure?.scheduled);
        const { time: arrivalTime } = formatDateTime(item.arrival?.scheduled);
    
        let statusColor = colors.primary; // Default to scheduled
        
        return (
            <View style={[styles.flightItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.topRow}>
                    <View style={styles.airlineInfo}>
                        <Ionicons name="airplane-sharp" size={20} color={colors.primary} />
                        <Text style={[styles.flightCode, { color: colors.primary }]}>{item.flight?.iata}</Text>
                        <Text style={[styles.airlineName, { color: colors.secondaryText }]}>{item.airline?.name}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                       <Text style={styles.statusText}>{t(`flights.status.${item.flight_status}`, item.flight_status)}</Text>
                    </View>
                </View>
    
                <View style={styles.routeRow}>
                     <View style={styles.locationColumn}>
                        <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.departure', 'Виліт')}</Text>
                        <Text style={[styles.timeText, { color: colors.text }]}>{departureTime}</Text>
                        <Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.departure?.airport}</Text>
                     </View>
                     <View style={styles.routeLine}>
                        <Text style={[styles.dateText, { color: colors.text }]}>{departureDay}</Text>
                        <View style={[styles.line, { backgroundColor: colors.border }]} />
                        <Ionicons name="airplane" size={16} color={colors.secondaryText} />
                     </View>
                     <View style={styles.locationColumn}>
                        <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.arrival', 'Приліт')}</Text>
                        <Text style={[styles.timeText, { color: colors.text }]}>{arrivalTime}</Text>
                        <Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.arrival?.airport}</Text>
                     </View>
                </View>
            </View>
        );
    };

    const renderDateItem = (date, onSelect) => (
        <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(date)}>
            <Text style={[styles.modalItemText, { color: colors.text }]}>{date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </TouchableOpacity>
    );

    const renderCountryItem = ([code, { name, flag }], onSelect) => (
        <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(code)}>
            <Text style={[styles.modalItemText, { color: colors.text }]}>{flag} {name}</Text>
        </TouchableOpacity>
    );

    const renderAirportItem = (airport, onSelect) => (
        <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(airport.iata)}>
            <Text style={[styles.modalItemText, { color: colors.text }]}>{airport.name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.headerContainer}>
                <Text style={[styles.title, { color: colors.text }]}>{t('flights.title', 'Пошук рейсів')}</Text>
                <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{t('flights.subtitle', 'Вкажіть маршрут та дату для пошуку.')}</Text>
            </View>

            <View style={styles.filtersContainer}>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.card }]} onPress={() => setDateModalVisible(true)}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.filterText, { color: colors.text }]}>{selectedDate?.toLocaleDateString([], { day: 'numeric', month: 'long' })}</Text>
                </TouchableOpacity>

                <View style={styles.routeContainer}>
                    <AirportSelector
                        label={t('flights.from', 'Звідки')}
                        country={originCountry}
                        airport={originAirport}
                        onCountryPress={() => setOriginCountryModalVisible(true)}
                        onAirportPress={() => setOriginAirportModalVisible(true)}
                        colors={colors}
                    />
                    <View style={styles.separator}>
                        <Ionicons name="swap-horizontal" size={24} color={colors.primary} />
                    </View>
                    <AirportSelector
                        label={t('flights.to', 'Куди')}
                        country={destinationCountry}
                        airport={destinationAirport}
                        onCountryPress={() => setDestinationCountryModalVisible(true)}
                        onAirportPress={() => setDestinationAirportModalVisible(true)}
                        colors={colors}
                    />
                </View>

                <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                    <Text style={[styles.searchButtonText, { color: '#fff' }]}>{t('flights.search', 'Знайти рейси')}</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ flex: 1, marginTop: 20 }} size="large" color={colors.primary} />
            ) : error ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={50} color={colors.secondaryText} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>{t('errors.flightLoadError', 'Не вдалося завантажити дані')}</Text>
                    <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={flights}
                    renderItem={renderFlight}
                    keyExtractor={(item, index) => (item.flight?.iata || index) + item.departure?.scheduled + index}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                           <Ionicons name="airplane-outline" size={50} color={colors.secondaryText} />
                           <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t('flights.noResults', 'Рейсів не знайдено.')}</Text>
                           <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>{t('flights.tryChangingParams', 'Спробуйте змінити параметри пошуку.')}</Text>
                        </View>
                    }
                    contentContainerStyle={{ flexGrow: 1, paddingTop: 10, paddingBottom: 20 }}
                />
            )}
            
            <SelectionModal
                visible={isDateModalVisible}
                onClose={() => setDateModalVisible(false)}
                onSelect={(date) => {
                    setSelectedDate(date);
                    setDateModalVisible(false);
                }}
                data={dates}
                title={t('flights.selectDate', 'Виберіть дату')}
                renderItem={renderDateItem}
            />
            <SelectionModal
                visible={isOriginCountryModalVisible}
                onClose={() => setOriginCountryModalVisible(false)}
                onSelect={(code) => {
                    setOriginCountry(code);
                    setOriginAirport(COUNTRIES[code].airports[0].iata);
                    setOriginCountryModalVisible(false);
                }}
                data={Object.entries(COUNTRIES)}
                title={t('flights.selectOriginCountry', 'Виберіть країну вильоту')}
                renderItem={renderCountryItem}
            />
            <SelectionModal
                visible={isOriginAirportModalVisible}
                onClose={() => setOriginAirportModalVisible(false)}
                onSelect={(iata) => {
                    setOriginAirport(iata);
                    setOriginAirportModalVisible(false);
                }}
                data={COUNTRIES[originCountry]?.airports}
                title={t('flights.selectOriginAirport', 'Виберіть аеропорт вильоту')}
                renderItem={renderAirportItem}
            />
            <SelectionModal
                visible={isDestinationCountryModalVisible}
                onClose={() => setDestinationCountryModalVisible(false)}
                onSelect={(code) => {
                    setDestinationCountry(code);
                    setDestinationAirport(COUNTRIES[code].airports[0].iata);
                    setDestinationCountryModalVisible(false);
                }}
                data={Object.entries(COUNTRIES)}
                title={t('flights.selectDestCountry', 'Виберіть країну призначення')}
                renderItem={renderCountryItem}
            />
            <SelectionModal
                visible={isDestinationAirportModalVisible}
                onClose={() => setDestinationAirportModalVisible(false)}
                onSelect={(iata) => {
                    setDestinationAirport(iata);
                    setDestinationAirportModalVisible(false);
                }}
                data={COUNTRIES[destinationCountry]?.airports}
                title={t('flights.selectDestAirport', 'Виберіть аеропорт призначення')}
                renderItem={renderAirportItem}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { fontSize: 15, textAlign: 'center', marginTop: 4, marginBottom: 8 },
    filtersContainer: { paddingHorizontal: 16, marginBottom: 10 },
    dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, marginBottom: 16 },
    routeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    selectorContainer: { flex: 1 },
    selectorLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
    selectorButton: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 8 },
    separator: { paddingHorizontal: 8, paddingBottom: 40 },
    searchButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    searchButtonText: { fontSize: 18, fontWeight: 'bold' },
    filterText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
    flagText: { fontSize: 20 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: -50 },
    emptyText: { marginTop: 15, fontSize: 18, fontWeight: '600', textAlign: 'center' },
    emptySubtext: { marginTop: 8, fontSize: 15, textAlign: 'center' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { maxHeight: '60%', borderTopRightRadius: 20, borderTopLeftRadius: 20, padding: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalItemText: { fontSize: 18, textAlign: 'center' },
    closeButton: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeButtonText: { fontSize: 18, fontWeight: 'bold' },
    flightItem: { borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1 },
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