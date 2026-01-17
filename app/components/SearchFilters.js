import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';

function countryCodeToEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

const CitySelector = memo(({ airport, onPress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    if (!airport) {
        return (
            <View style={styles.selectorButton}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.selectorButton} onPress={onPress}>
            <Text style={styles.flagText}>{countryCodeToEmoji(airport.country_code)}</Text>
            <View style={styles.cityInfo}>
                <Text style={styles.cityName} numberOfLines={1}>{airport.name_uk || airport.city || airport.name}</Text>
                <Text style={styles.iataText}>{airport.iata_code}</Text>
            </View>
        </TouchableOpacity>
    );
});

const SearchFilters = ({
    origin,
    destination,
    selectedDate,
    onOriginPress,
    onDestinationPress,
    onDatePress,
    onSwap,
    onSearch,
    isLoading,
}) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <View style={styles.routeCard}>
                <CitySelector airport={origin} onPress={onOriginPress} />
                <TouchableOpacity style={styles.swapButton} onPress={onSwap}>
                    <Ionicons name="swap-horizontal" size={28} color={colors.primary} />
                </TouchableOpacity>
                <CitySelector airport={destination} onPress={onDestinationPress} />
            </View>

            <TouchableOpacity style={styles.dateButton} onPress={onDatePress}>
                <Ionicons name="calendar-outline" size={20} color={colors.text} />
                <Text style={styles.dateText}>
                    {selectedDate ? moment(selectedDate).format('dd, D MMMM') : t('flights.selectDate', 'Виберіть дату')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSearch} disabled={isLoading}>
                <LinearGradient
                    colors={isLoading ? ['#aaa', '#888'] : [colors.primary, '#3498db']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.searchButton}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="search" size={22} color="#fff" />
                            <Text style={styles.searchButtonText}>{t('flights.search', 'Знайти рейси')}</Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: { padding: 16 },
    routeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
    selectorButton: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: 8, height: 60 },
    flagText: { fontSize: 32, marginRight: 10 },
    cityInfo: { flex: 1, marginRight: 5 },
    cityName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    iataText: { fontSize: 14, color: colors.secondaryText },
    swapButton: { paddingHorizontal: 8 },
    dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, marginBottom: 20, backgroundColor: colors.card },
    dateText: { marginLeft: 10, fontSize: 16, fontWeight: '600', color: colors.text },
    searchButton: { flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    searchButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10 },
});

export default memo(SearchFilters);
