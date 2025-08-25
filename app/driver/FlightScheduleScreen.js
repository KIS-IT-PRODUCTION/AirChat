// app/FlightScheduleScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons'; // <-- Додано імпорт іконок

// Початкові аеропорти для прикладу
const AIRPORTS = [
    { name: 'Київ (Бориспіль)', iata: 'KBP' },
    { name: 'Варшава (Шопен)', iata: 'WAW' },
    { name: 'Краків (Баліце)', iata: 'KRK' },
];

export default function FlightScheduleScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const [flights, setFlights] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAirport, setSelectedAirport] = useState('WAW'); // Змінено на Варшаву для тестування

    useEffect(() => {
        const fetchFlights = async () => {
            if (!selectedAirport) return;
            setIsLoading(true);
            setError(null);
            setFlights([]);
            try {
                const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                    body: { airportIata: selectedAirport },
                });

                if (funcError) throw funcError;
                if (data && data.error) throw new Error(data.error.message || t('errors.apiError'));
                
                if (data && Array.isArray(data.data)) {
                    setFlights(data.data);
                } else {
                    console.warn("Unexpected data structure received:", data);
                    setError(t('errors.unexpectedData'));
                }
            } catch (e) {
                console.error("Error fetching flights:", e.message);
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFlights();
    }, [selectedAirport, t]);
    
    // Функція для форматування дати та часу
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const day = date.toLocaleDateString([], { day: '2-digit', month: 'short' });
        return { time, day };
    };

   const renderFlight = ({ item }) => {
    const { time: departureTime, day: departureDay } = formatDateTime(item.departure.scheduled);

    // Визначення кольору статусу
    let statusColor = colors.secondaryText;
    if (item.flight_status === 'scheduled') statusColor = colors.primary;
    if (item.flight_status === 'active' || item.flight_status === 'landed') statusColor = '#28a745'; // Зелений
    if (item.flight_status === 'cancelled' || item.flight_status === 'diverted') statusColor = '#dc3545'; // Червоний
    
    return (
        <View style={[styles.flightItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topRow}>
                <View style={styles.airlineInfo}>
                    <Ionicons name="airplane-sharp" size={20} color={colors.primary} />
                    <Text style={[styles.flightCode, { color: colors.primary }]}>{item.flight.iata}</Text>
                    <Text style={[styles.airlineName, { color: colors.secondaryText }]}>{item.airline.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                   <Text style={styles.statusText}>{t(`flights.status.${item.flight_status}`, item.flight_status)}</Text>
                </View>
            </View>

            <View style={styles.routeRow}>
                 <View style={styles.locationColumn}>
                    <Text style={[styles.timeText, { color: colors.text }]}>{departureTime}</Text>
                    {/* ЗМІНА ТУТ: показуємо повну назву аеропорту */}
                    <Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.departure.airport}</Text>
                 </View>
                 <View style={styles.routeLine}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{departureDay}</Text>
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                    <Ionicons name="airplane" size={16} color={colors.secondaryText} />
                 </View>
                 <View style={styles.locationColumn}>
                    {item.arrival.scheduled && (
                        <Text style={[styles.timeText, { color: colors.text }]}>{formatDateTime(item.arrival.scheduled).time}</Text>
                    )}
                    {/* І ЗМІНА ТУТ: показуємо повну назву аеропорту */}
                    <Text style={[styles.airportName, { color: colors.secondaryText }]}>{item.arrival.airport}</Text>
                 </View>
            </View>
        </View>
    );
};

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t('flights.title', 'Розклад рейсів')}</Text>
            <Text style={[styles.subTitle, { color: colors.secondaryText }]}>
                {t('flights.departuresFrom', 'Вильоти з')} {AIRPORTS.find(ap => ap.iata === selectedAirport)?.name || selectedAirport}
            </Text>

            {isLoading ? (
                <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />
            ) : error ? (
                <Text style={[styles.errorText, { color: '#dc3545' }]}>{error}</Text>
            ) : (
                <FlatList
                    data={flights}
                    renderItem={renderFlight}
                    keyExtractor={(item, index) => item.flight.iata + item.departure.scheduled + index}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                           <Ionicons name="information-circle-outline" size={40} color={colors.secondaryText} />
                           <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t('flights.emptyList')}</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 16, },
    subTitle: { fontSize: 16, textAlign: 'center', marginBottom: 20, marginHorizontal: 16, },
    flightItem: { borderRadius: 12, marginHorizontal: 16, marginBottom: 16, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.05, shadowRadius: 2.22, elevation: 3, },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    airlineInfo: { flexDirection: 'row', alignItems: 'center', },
    flightCode: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, },
    airlineName: { fontSize: 14, marginLeft: 5, },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, },
    statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', },
    locationColumn: { flex: 1, alignItems: 'center', },
    timeText: { fontSize: 20, fontWeight: '600', },
    iataCode: { fontSize: 14, letterSpacing: 1, marginTop: 4, },
    routeLine: { flex: 2, alignItems: 'center', },
    dateText: { fontSize: 12, fontWeight: '600', marginBottom: 2, },
    line: { height: 1, width: '100%', },
    errorText: { textAlign: 'center', marginTop: 50, fontSize: 16, paddingHorizontal: 20, },
    emptyContainer: { marginTop: 50, alignItems: 'center', justifyContent: 'center', },
    emptyText: { marginTop: 10, fontSize: 16, },
});