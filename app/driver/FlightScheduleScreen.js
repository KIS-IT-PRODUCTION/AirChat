// app/FlightScheduleScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';

// Структура даних для країн та аеропортів
const COUNTRIES = {
    'PL': { name: 'Польща', flag: '🇵🇱', airports: [{ name: 'Варшава (Шопен)', iata: 'WAW' }, { name: 'Краків (Баліце)', iata: 'KRK' }, { name: 'Гданськ', iata: 'GDN' }] },
    'DE': { name: 'Німеччина', flag: '🇩🇪', airports: [{ name: 'Берлін (Бранденбург)', iata: 'BER' }, { name: 'Мюнхен', iata: 'MUC' }, { name: 'Франкфурт', iata: 'FRA' }] },
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
                        <Text style={[styles.closeButtonText, { color: colors.primary }]}>{t('common.close')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};


export default function FlightScheduleScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [selectedCountry, setSelectedCountry] = useState('PL');
    const [selectedAirport, setSelectedAirport] = useState('WAW');
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isDateModalVisible, setDateModalVisible] = useState(false);
    const [isCountryModalVisible, setCountryModalVisible] = useState(false);
    const [isAirportModalVisible, setAirportModalVisible] = useState(false);
    const [flights, setFlights] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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

    useEffect(() => {
        if (!selectedAirport || !selectedDate) return;
        const fetchFlights = async () => {
            setIsLoading(true);
            setError(null);
            setFlights([]);
            try {
                const flightDate = selectedDate.toISOString().split('T')[0];
                const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                    body: { airportIata: selectedAirport, flightDate },
                });
                if (funcError) throw funcError;
                if (data && data.error) throw new Error(data.error.message || t('errors.apiError'));
                if (data && Array.isArray(data.data)) {
                    setFlights(data.data);
                } else {
                    setError(t('errors.unexpectedData'));
                }
            } catch (e) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFlights();
    }, [selectedAirport, selectedDate, t]);
    
    // ✨ ОНОВЛЕНА ФУНКЦІЯ ФОРМАТУВАННЯ
    const formatDateTime = (dateString) => {
        // Якщо даних немає, повертаємо заповнювач
        if (!dateString) return { time: '--:--', day: '' };
        
        const date = new Date(dateString);
        // Додаткова перевірка на випадок некоректної дати
        if (isNaN(date.getTime())) {
            return { time: '--:--', day: '' };
        }
        
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
        return { time, day };
    };

    const renderFlight = ({ item }) => {
            console.log('Flight Status from API:', item.flight_status);

        const { time: departureTime, day: departureDay } = formatDateTime(item.departure?.scheduled);
        const { time: arrivalTime } = formatDateTime(item.arrival?.scheduled);
    
        let statusColor = colors.secondaryText;
        if (item.flight_status === 'scheduled') statusColor = colors.primary;
        if (item.flight_status === 'active' || item.flight_status === 'landed') statusColor = '#28a745';
        if (item.flight_status === 'cancelled' || item.flight_status === 'diverted') statusColor = '#dc3545';
        
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
                        <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.departure')}</Text>
                        <Text style={[styles.timeText, { color: colors.text }]}>{departureTime}</Text>
                        <Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.departure?.airport}</Text>
                     </View>
                     <View style={styles.routeLine}>
                        <Text style={[styles.dateText, { color: colors.text }]}>{departureDay}</Text>
                        <View style={[styles.line, { backgroundColor: colors.border }]} />
                        <Ionicons name="airplane" size={16} color={colors.secondaryText} />
                     </View>
                     <View style={styles.locationColumn}>
                        <Text style={[styles.timeLabel, { color: colors.secondaryText }]}>{t('flights.arrival')}</Text>
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
            <Text style={[styles.title, { color: colors.text }]}>{t('flights.title')}</Text>

            <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.filterButton} onPress={() => setDateModalVisible(true)}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.filterText, { color: colors.text }]}>{selectedDate?.toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton} onPress={() => setCountryModalVisible(true)}>
                    <Text style={styles.flagText}>{COUNTRIES[selectedCountry]?.flag}</Text>
                    <Text style={[styles.filterText, { color: colors.text }]}>{COUNTRIES[selectedCountry]?.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterButton} onPress={() => setAirportModalVisible(true)}>
                    <Ionicons name="location-outline" size={20} color={colors.primary} />
                    <Text style={[styles.filterText, { color: colors.text, flex: 1 }]} numberOfLines={1}>{COUNTRIES[selectedCountry]?.airports.find(a => a.iata === selectedAirport)?.name}</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
            ) : error ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={50} color={colors.secondaryText} />
                    <Text style={[styles.errorText, { color: '#dc3545' }]}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={flights}
                    renderItem={renderFlight}
                    keyExtractor={(item, index) => (item.flight?.iata || index) + item.departure?.scheduled + index}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                           <Ionicons name="airplane-outline" size={50} color={colors.secondaryText} />
                           <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t('flights.emptyList')}</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
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
                title={t('flights.selectDate')}
                renderItem={renderDateItem}
            />
            <SelectionModal
                visible={isCountryModalVisible}
                onClose={() => setCountryModalVisible(false)}
                onSelect={(code) => {
                    setSelectedCountry(code);
                    setSelectedAirport(COUNTRIES[code].airports[0].iata);
                    setCountryModalVisible(false);
                }}
                data={Object.entries(COUNTRIES)}
                title={t('flights.selectCountry')}
                renderItem={renderCountryItem}
            />
            <SelectionModal
                visible={isAirportModalVisible}
                onClose={() => setAirportModalVisible(false)}
                onSelect={(iata) => {
                    setSelectedAirport(iata);
                    setAirportModalVisible(false);
                }}
                data={COUNTRIES[selectedCountry]?.airports}
                title={t('flights.selectAirport')}
                renderItem={renderAirportItem}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: 16, borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3.0, elevation: 3, borderBottomWidth: 1 },
    filterButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8 },
    filterText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
    flagText: { fontSize: 20 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { maxHeight: '60%', borderTopRightRadius: 20, borderTopLeftRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalItemText: { fontSize: 18, textAlign: 'center' },
    closeButton: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    closeButtonText: { fontSize: 18, fontWeight: 'bold' },
    flightItem: { borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2.22, elevation: 3 },
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
    errorText: { textAlign: 'center', marginTop: 15, fontSize: 16, paddingHorizontal: 20 },
    emptyContainer: { flex: 1, marginTop: '30%', alignItems: 'center', justifyContent: 'center' },
    emptyText: { marginTop: 15, fontSize: 18, fontWeight: '500' },
});