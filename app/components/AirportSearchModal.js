import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';

const ITEM_HEIGHT = 60;

function countryCodeToEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

const AirportSearchModal = ({ visible, onClose, onSelect, title }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Якщо тексту мало, очищаємо результати одразу
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        let isCurrentRequest = true; // ✨ Запобіжник для "гонки запитів"

        // Запускаємо таймер ТІЛЬКИ на фактичний пошук
        const handler = setTimeout(async () => {
            if (!isCurrentRequest) return;
            
            // Вмикаємо завантаження ТІЛЬКИ коли юзер перестав друкувати
            setIsLoading(true); 

            try {
                const { data, error } = await supabase.rpc('search_airports', { search_term: searchQuery.trim() });
                
                // Оновлюємо стейт, тільки якщо юзер не почав вводити новий текст
                if (isCurrentRequest) {
                    if (error) {
                        console.error("Airport search RPC error:", error.message);
                        setResults([]);
                    } else {
                        setResults(data || []);
                    }
                }
            } catch (err) {
                console.error(err);
                if (isCurrentRequest) setResults([]);
            } finally {
                if (isCurrentRequest) {
                    setIsLoading(false);
                }
            }
        }, 400); // ✨ Збільшено debounce до 400мс. Це ідеальний час, щоб дочекатись кінця вводу слова.

        // Функція очищення: спрацьовує, якщо юзер ввів нову букву до завершення таймауту
        return () => {
            isCurrentRequest = false; 
            clearTimeout(handler);
        };
    }, [searchQuery]);

    const handleClose = () => {
        setSearchQuery('');
        setResults([]);
        setIsLoading(false);
        onClose();
    };

    const renderItem = ({ item }) => {
        const displayName = item.name_uk || item.city || item.name;
        const subDisplayName = item.name_uk ? `${item.city}, ${item.country_code}` : item.name;

        return (
            <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                <Text style={styles.flagText}>{countryCodeToEmoji(item.country_code)}</Text>
                <View style={styles.cityInfo}>
                    <Text style={styles.cityName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.airportName} numberOfLines={1}>{subDisplayName}</Text>
                </View>
                <Text style={styles.iataCode}>{item.iata_code}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
            <Pressable style={styles.modalOverlay} onPress={handleClose}>
                <Pressable style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.handleBar} />
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={t('flights.searchAirport', 'Введіть місто, назву або код...')}
                            placeholderTextColor={colors.secondaryText}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={true}
                            autoCorrect={false} // ✨ Додано, щоб клавіатура не "тупила" при перевірці орфографії
                        />
                    </View>
                    
                    {isLoading ? (
                        <ActivityIndicator style={{ marginVertical: 20 }} size="large" color={colors.primary} />
                    ) : results.length === 0 && searchQuery.trim().length > 1 ? (
                        <Text style={styles.noResultsText}>{t('flights.noAirportsFound', 'Аеропортів не знайдено')}</Text>
                    ) : (
                        <FlatList
                            data={results}
                            keyExtractor={(item) => `${item.iata_code}-${item.name}`}
                            renderItem={renderItem}
                            getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                            keyboardShouldPersistTaps="handled"
                            initialNumToRender={15} // ✨ Оптимізація рендеру списку
                            maxToRenderPerBatch={10}
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const getStyles = (colors) => StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { height: '85%', borderTopRightRadius: 24, borderTopLeftRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
    handleBar: { width: 40, height: 5, backgroundColor: colors.border, borderRadius: 3, alignSelf: 'center', marginVertical: 8 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 48, color: colors.text, fontSize: 16 },
    modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, height: ITEM_HEIGHT },
    flagText: { fontSize: 24, marginRight: 12, minWidth: 30 },
    cityInfo: { flex: 1, justifyContent: 'center' },
    cityName: { fontSize: 16, fontWeight: '600', color: colors.text },
    airportName: { fontSize: 13, color: colors.secondaryText },
    iataCode: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginLeft: 8 },
    noResultsText: { textAlign: 'center', color: colors.secondaryText, fontSize: 16, marginTop: 20 },
});

export default memo(AirportSearchModal);