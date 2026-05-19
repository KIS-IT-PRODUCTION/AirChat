import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Platform, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import DateTimePicker from '@react-native-community/datetimepicker';

import SearchFilters from '../components/SearchFilters';
import FlightCard from '../components/FlightCard';
import AirportSearchModal from '../components/AirportSearchModal';
import EmptyState from '../components/EmptyState';
import FlightLoadingAnimation from '../components/FlightLoadingAnimation';
import Logo from '../../assets/icon.svg';

const FlightScheduleScreen = () => {
    const { colors, isDarkMode } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = getStyles(colors);

    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    const [isOriginModalVisible, setOriginModalVisible] = useState(false);
    const [isDestinationModalVisible, setDestinationModalVisible] = useState(false);

    const [flights, setFlights] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const locale = i18n.language === 'en' ? 'en-gb' : i18n.language;
        moment.locale(locale);

        const fetchInitialAirports = async () => {
            const { data, error } = await supabase
                .from('airports')
                .select('*')
                .in('iata_code', ['RMO', 'IST']);

            if (error) {
                console.error('Error fetching initial airports:', error);
            } else if (data && data.length > 0) {
                const rmo = data.find(a => a.iata_code === 'RMO') || data[0];
                const ist = data.find(a => a.iata_code === 'IST') || (data.length > 1 ? data[1] : data[0]);
                setOrigin(rmo);
                setDestination(ist);
            }
        };

        fetchInitialAirports();
    }, [i18n.language]);

    const onDateChange = useCallback((event, newDate) => {
        if (Platform.OS === 'android') {
            setDatePickerVisible(false);
            if (newDate) {
                setSelectedDate(newDate);
                setTempDate(newDate);
            }
        } else if (newDate) {
            setTempDate(newDate);
        }
    }, []);

    const handleConfirmDate = () => {
        setSelectedDate(tempDate);
        setDatePickerVisible(false);
    };

    const handleCancelDate = () => {
        setTempDate(selectedDate);
        setDatePickerVisible(false);
    };

    const handleSearch = useCallback(async () => {
        if (!origin || !destination || !selectedDate) {
            setError(t('errors.fillAllFields', 'Будь ласка, заповніть всі поля'));
            return;
        }

        setIsLoading(true);
        setSearched(true);
        setError(null);
        setFlights([]);

        try {
            const flightDate = moment(selectedDate).format('YYYY-MM-DD');

            const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                body: {
                    originIata: origin.iata_code,
                    destinationIata: destination.iata_code,
                    flightDate,
                },
            });

            if (funcError) throw funcError;
            if (data?.error) throw new Error(data.error);

            const receivedFlights = data?.data;

            if (Array.isArray(receivedFlights)) {
                setFlights(receivedFlights);
            } else {
                setFlights([]);
            }
        } catch (e) {
            setError(e.message || t('errors.apiError', 'Помилка завантаження рейсів'));
        } finally {
            setIsLoading(false);
        }
    }, [origin, destination, selectedDate, t]);

    const renderFlight = useCallback(
        ({ item, index }) => (
            <FlightCard
                item={item}
                index={index}
                originTimezone={origin?.timezone}
                destinationTimezone={destination?.timezone}
            />
        ),
        [origin, destination]
    );

    // Results header with count and timezone info
    const renderResultsHeader = () => {
        if (!searched || isLoading || flights.length === 0) return null;

        const originTz = origin?.timezone || 'UTC';
        const destTz = destination?.timezone || 'UTC';

        return (
            <View style={styles.resultsHeader}>
                <View style={styles.flightCountBadge}>
                    <Text style={styles.flightCountNumber}>{flights.length}</Text>
                    <Text style={styles.flightCountLabel}>
                        {t('flights.flightsFound', { count: flights.length, defaultValue: `рейс${flights.length === 1 ? '' : flights.length < 5 ? 'и' : 'ів'} знайдено` })}
                    </Text>
                </View>
                <View style={styles.timezoneRow}>
                    <View style={styles.tzBadge}>
                        <Text style={styles.tzIata}>{origin?.iata_code}</Text>
                        <Text style={styles.tzValue}>{formatTzOffset(originTz)}</Text>
                    </View>
                    <Text style={styles.tzSeparator}>→</Text>
                    <View style={styles.tzBadge}>
                        <Text style={styles.tzIata}>{destination?.iata_code}</Text>
                        <Text style={styles.tzValue}>{formatTzOffset(destTz)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (isLoading) return <FlightLoadingAnimation />;
        if (error) return <EmptyState icon="cloud-offline-outline" title={t('errors.flightLoadError')} message={error} />;
        if (searched && flights.length === 0) return <EmptyState icon="airplane-outline" title={t('flights.noResults')} message={t('flights.tryChangingParams')} />;
        return <EmptyState icon="search-circle-outline" title={t('flights.findYourFlight')} message={t('flights.selectParamsAndSearch')} />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Logo width={60} height={60} />
                <Text style={styles.title}>{t('flights.title', 'Розклад рейсів')}</Text>
            </View>

            <FlatList
                ListHeaderComponent={
                    <>
                        <SearchFilters
                            origin={origin}
                            destination={destination}
                            selectedDate={selectedDate}
                            onOriginPress={() => setOriginModalVisible(true)}
                            onDestinationPress={() => setDestinationModalVisible(true)}
                            onDatePress={() => {
                                setTempDate(selectedDate);
                                setDatePickerVisible(true);
                            }}
                            onSwap={() => { setOrigin(destination); setDestination(origin); }}
                            onSearch={handleSearch}
                            isLoading={isLoading}
                        />
                        {renderResultsHeader()}
                    </>
                }
                data={flights}
                renderItem={renderFlight}
                keyExtractor={(item, index) => `${item.flight?.iata}-${item.departure?.scheduled}-${index}`}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            />

            <Modal
                transparent={true}
                animationType="fade"
                visible={isDatePickerVisible && Platform.OS === 'ios'}
                onRequestClose={handleCancelDate}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={handleCancelDate}>
                    <TouchableOpacity activeOpacity={1} style={styles.datePickerModal}>
                        <DateTimePicker
                            value={tempDate}
                            mode="date"
                            display="inline"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                            locale={i18n.language}
                            themeVariant={isDarkMode ? 'dark' : 'light'}
                        />
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDate}>
                            <Text style={styles.confirmButtonText}>{t('common.confirm', 'Підтвердити')}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {isDatePickerVisible && Platform.OS === 'android' && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                />
            )}

            <AirportSearchModal
                visible={isOriginModalVisible}
                onClose={() => setOriginModalVisible(false)}
                onSelect={(airport) => { setOrigin(airport); setOriginModalVisible(false); }}
                title={t('flights.selectOriginAirport')}
            />
            <AirportSearchModal
                visible={isDestinationModalVisible}
                onClose={() => setDestinationModalVisible(false)}
                onSelect={(airport) => { setDestination(airport); setDestinationModalVisible(false); }}
                title={t('flights.selectDestAirport')}
            />
        </SafeAreaView>
    );
};

// Helper: format IANA timezone to UTC offset string e.g. "Europe/Kiev" → "UTC+3"
function formatTzOffset(timezone) {
    if (!timezone) return 'UTC';
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en', {
            timeZone: timezone,
            timeZoneName: 'shortOffset',
        });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        return offsetPart?.value || timezone;
    } catch {
        return timezone;
    }
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', flex: 1, position: 'absolute', left: 0, right: 0 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    datePickerModal: { width: '90%', backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    confirmButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, marginTop: 10, width: '100%', alignItems: 'center' },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Results header
    resultsHeader: {
        marginHorizontal: 16,
        marginBottom: 12,
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flightCountBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    flightCountNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.primary,
        lineHeight: 32,
    },
    flightCountLabel: {
        fontSize: 14,
        color: colors.secondaryText,
        fontWeight: '500',
    },
    timezoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    tzBadge: {
        alignItems: 'center',
    },
    tzIata: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    tzValue: {
        fontSize: 11,
        color: colors.secondaryText,
        fontWeight: '500',
    },
    tzSeparator: {
        fontSize: 12,
        color: colors.secondaryText,
        paddingHorizontal: 2,
    },
});

export default memo(FlightScheduleScreen);