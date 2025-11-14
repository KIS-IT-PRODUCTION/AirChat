// components/FlightCard.js
import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { MotiView } from 'moti';

const FlightCard = ({ item, index }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();

    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return { time: '--:--', day: '' };
        const date = moment(dateString);
        return {
            time: date.format('HH:mm'),
            day: date.format('D MMM'),
        };
    }, []);

    const { time: departureTime, day: departureDay } = formatDateTime(item.departure?.scheduled);
    const { time: arrivalTime } = formatDateTime(item.arrival?.scheduled);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'scheduled': case 'active': return { backgroundColor: '#3498db' };
            case 'landed': return { backgroundColor: '#2ecc71' };
            case 'cancelled': return { backgroundColor: '#e74c3c' };
            default: return { backgroundColor: colors.secondaryText };
        }
    };
    
    const statusStyle = getStatusStyle(item.flight_status);

    return (
        <MotiView
            from={{ opacity: 0, transform: [{ translateY: 50 }, { scale: 0.9 }] }}
            animate={{ opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] }}
            transition={{ type: 'timing', duration: 400, delay: index * 100 }}
        >
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.airlineInfo}>
                        <Image source={{ uri: `https://daisycon.io/images/airline/?width=300&height=150&iata=${item.flight?.iata.slice(0, 2)}` }} style={styles.airlineLogo} />
                        <View>
                            <Text style={styles.flightCode}>{item.flight?.iata}</Text>
                            <Text style={styles.airlineName}>{item.airline?.name}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={styles.statusText}>
                            {t(`flights.status.${item.flight_status}`, item.flight_status)}
                        </Text>
                    </View>
                </View>

                <View style={styles.routeRow}>
                    <View style={styles.locationColumn}>
                        <Text style={styles.timeText}>{departureTime}</Text>
                        <Text style={styles.iataText}>{item.departure?.iata}</Text>
                    </View>
                    <View style={styles.routeLine}>
                        <Text style={styles.dateText}>{departureDay}</Text>
                        <View style={styles.line}>
                           <Ionicons name="airplane" size={16} color={colors.primary} style={styles.airplaneIcon}/>
                        </View>
                    </View>
                    <View style={styles.locationColumn}>
                        <Text style={styles.timeText}>{arrivalTime}</Text>
                        <Text style={styles.iataText}>{item.arrival?.iata}</Text>
                    </View>
                </View>
            </View>
        </MotiView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 20, marginHorizontal: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: 1, borderColor: colors.border },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    airlineInfo: { flexDirection: 'row', alignItems: 'center' },
    airlineLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 10, backgroundColor: colors.border },
    flightCode: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    airlineName: { fontSize: 13, color: colors.secondaryText },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
    routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationColumn: { flex: 1, alignItems: 'center' },
    timeText: { fontSize: 22, fontWeight: '600', color: colors.text },
    iataText: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 4 },
    routeLine: { flex: 2, alignItems: 'center' },
    dateText: { fontSize: 12, fontWeight: '600', color: colors.secondaryText, marginBottom: 2 },
    line: { height: 1, width: '100%', backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    airplaneIcon: { backgroundColor: colors.card, paddingHorizontal: 4 },
});

export default memo(FlightCard);