import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { MotiView } from 'moti';

// Format IANA timezone → short offset string e.g. "UTC+3"
function formatTzOffset(timezone) {
    if (!timezone) return null;
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        return offsetPart?.value || null;
    } catch {
        return null;
    }
}

const FlightCard = ({ item, index, originTimezone, destinationTimezone }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();

    const formatDateTime = useCallback((dateString) => {
        if (!dateString) return { time: '--:--', day: '' };

        const isTimeOnly = /^\d{2}:\d{2}$/.test(dateString.trim());
        if (isTimeOnly) {
            return { time: dateString.trim(), day: '' };
        }

        const date = moment(dateString);
        return {
            time: date.isValid() ? date.format('HH:mm') : '--:--',
            day:  date.isValid() ? date.format('D MMM') : '',
        };
    }, []);

    const { time: departureTime, day: departureDay } = formatDateTime(item.departure?.scheduled);
    const { time: arrivalTime,  day: arrivalDay }   = formatDateTime(item.arrival?.scheduled);

    const currentStatus = (item.flight_status || item.status || 'scheduled').toLowerCase();

    const getStatusStyle = (status) => {
        switch (status) {
            case 'scheduled':
            case 'active':
                return { backgroundColor: '#3498db' };
            case 'landed':
                return { backgroundColor: '#2ecc71' };
            case 'cancelled':
            case 'canceled':
                return { backgroundColor: '#e74c3c' };
            default:
                return { backgroundColor: colors.secondaryText };
        }
    };

    const airlineIata = item.airline?.iata || item.flight?.iata?.slice(0, 2) || '';

    const originTzLabel = formatTzOffset(originTimezone);
    const destTzLabel = formatTzOffset(destinationTimezone);

    return (
        <MotiView
            from={{ opacity: 0, transform: [{ translateY: 50 }, { scale: 0.9 }] }}
            animate={{ opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] }}
            transition={{ type: 'timing', duration: 400, delay: index * 80 }}
        >
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.airlineInfo}>
                        <Image
                            source={{ uri: `https://daisycon.io/images/airline/?width=300&height=150&iata=${airlineIata}` }}
                            style={styles.airlineLogo}
                        />
                        <View>
                            <Text style={styles.flightCode}>{item.flight?.iata}</Text>
                            <Text style={styles.airlineName}>{item.airline?.name}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, getStatusStyle(currentStatus)]}>
                        <Text style={styles.statusText}>
                            {t(`flights.status.${currentStatus}`, 'За розкладом')}
                        </Text>
                    </View>
                </View>

                {/* Route */}
                <View style={styles.routeRow}>
                    {/* Departure */}
                    <View style={styles.locationColumn}>
                        <Text style={styles.timeText}>{departureTime}</Text>
                        <Text style={styles.iataText}>{item.departure?.iata}</Text>
                        {departureDay ? (
                            <Text style={styles.dayText}>{departureDay}</Text>
                        ) : null}
                        {originTzLabel ? (
                            <View style={styles.tzPill}>
                                <Text style={styles.tzPillText}>{originTzLabel}</Text>
                            </View>
                        ) : (
                            <Text style={styles.localLabel}>
                                {t('flights.localTime', 'місц. час')}
                            </Text>
                        )}
                    </View>

                    {/* Route line */}
                    <View style={styles.routeLine}>
                        {item.duration_minutes ? (
                            <Text style={styles.dateText}>
                                {`${Math.floor(item.duration_minutes / 60)}г ${item.duration_minutes % 60}хв`}
                            </Text>
                        ) : null}
                        <View style={styles.line}>
                            <Ionicons name="airplane" size={16} color={colors.primary} style={styles.airplaneIcon} />
                        </View>
                    </View>

                    {/* Arrival */}
                    <View style={styles.locationColumn}>
                        <Text style={styles.timeText}>{arrivalTime}</Text>
                        <Text style={styles.iataText}>{item.arrival?.iata}</Text>
                        {arrivalDay ? (
                            <Text style={styles.dayText}>{arrivalDay}</Text>
                        ) : null}
                        {destTzLabel ? (
                            <View style={styles.tzPill}>
                                <Text style={styles.tzPillText}>{destTzLabel}</Text>
                            </View>
                        ) : (
                            <Text style={styles.localLabel}>
                                {t('flights.localTime', 'місц. час')}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </MotiView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    airlineInfo: { flexDirection: 'row', alignItems: 'center' },
    airlineLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 10, backgroundColor: colors.border },
    flightCode: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    airlineName: { fontSize: 13, color: colors.secondaryText },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },

    routeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    locationColumn: { flex: 1, alignItems: 'center', gap: 2 },
    timeText: { fontSize: 24, fontWeight: '700', color: colors.text },
    iataText: { fontSize: 15, fontWeight: 'bold', color: colors.primary, marginTop: 2 },
    dayText: { fontSize: 11, color: colors.secondaryText },
    localLabel: { fontSize: 10, color: colors.secondaryText, fontStyle: 'italic' },

    // Timezone pill badge
    tzPill: {
        backgroundColor: colors.primary + '20',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    tzPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.3,
    },

    routeLine: { flex: 2, alignItems: 'center' },
    dateText: { fontSize: 12, fontWeight: '600', color: colors.secondaryText, marginBottom: 4 },
    line: { height: 1, width: '100%', backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    airplaneIcon: { backgroundColor: colors.card, paddingHorizontal: 4 },
});

export default memo(FlightCard);