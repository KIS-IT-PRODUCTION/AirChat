import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Platform, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import DateTimePicker from '@react-native-community/datetimepicker';

import SearchFilters from '../components/SearchFilters';
import FlightCard from '../components/FlightCard';
import AirportSearchModal from '../components/AirportSearchModal'; // Впевнийсь, що шлях правильний
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
                .in('iata_code', ['OTP', 'KIV']); // Змінив дефолтні на Румунію/Молдову для прикладу

            if (error) {
                console.error("Error fetching initial airports:", error);
            } else if (data && data.length > 0) {
                const otp = data.find(a => a.iata_code === 'OTP') || data[0];
                const kiv = data.find(a => a.iata_code === 'KIV') || (data.length > 1 ? data[1] : data[0]);
                setOrigin(otp);
                setDestination(kiv);
            }
        };

        fetchInitialAirports();
    }, []);

    const onDateChange = useCallback((event, newDate) => {
        if (Platform.OS === 'android') {
            setDatePickerVisible(false);
            if (newDate) {
                setSelectedDate(newDate);
                setTempDate(newDate);
            }
        } else {
            if (newDate) {
                setTempDate(newDate);
            }
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
            // Форматуємо дату суворо як YYYY-MM-DD
            const flightDate = moment(selectedDate).format('YYYY-MM-DD');
            
            console.log("Відправляємо запит на сервер:", {
                originIata: origin.iata_code,
                destinationIata: destination.iata_code,
                flightDate
            });

            const { data, error: funcError } = await supabase.functions.invoke('flight-schedule', {
                body: {
                    originIata: origin.iata_code,
                    destinationIata: destination.iata_code,
                    flightDate,
                }
            });

            // Якщо сама функція не змогла виконатися (наприклад, впав сервер)
            if (funcError) {
                console.error("Помилка виклику Edge-функції:", funcError);
                throw funcError;
            }

            // Якщо функція виконалася, але повернула власну помилку (наприклад, SerpApi error)
            if (data && data.error) {
                console.error("Помилка від API рейсів:", data.error);
                throw new Error(data.error);
            }

            console.log("Отримані рейси:", data?.data);

            // Безпечно встановлюємо рейси (перевіряємо, чи data.data є масивом)
            const receivedFlights = data?.data;
            if (Array.isArray(receivedFlights)) {
                setFlights(receivedFlights);
                if (receivedFlights.length === 0) {
                     // Логуємо, якщо API відповів успішно, але рейсів 0
                     console.log("Рейсів на цю дату не знайдено.");
                }
            } else {
                console.warn("API повернув неочікуваний формат даних:", data);
                setFlights([]);
            }

        } catch (e) {
            console.error("Catch Error:", e.message);
            setError(e.message || t('errors.apiError', 'Помилка завантаження рейсів'));
        } finally {
            setIsLoading(false);
        }
    }, [origin, destination, selectedDate, t]);
    
    const renderFlight = useCallback(({ item, index }) => <FlightCard item={item} index={index} />, []);

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
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    datePickerModal: {
        width: '90%',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    confirmButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        marginTop: 10,
        width: '100%',
        alignItems: 'center',
    },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default memo(FlightScheduleScreen);