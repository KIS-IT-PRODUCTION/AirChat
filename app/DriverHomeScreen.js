// app/DriverHomeScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import Logo from '../assets/icon.svg';

// ✨ ПОВНІСТЮ ПЕРЕРОБЛЕНИЙ КОМПОНЕНТ КАРТКИ ВІДПОВІДНО ДО ДИЗАЙНУ
const TransferRequestCard = ({ item, onPress }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);

    const getShortName = (name) => {
        if (!name) return '';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return `${parts[0]} ${parts[1].charAt(0)}.`;
        }
        return name;
    };

    // ✨ ВИПРАВЛЕНА ФУНКЦІЯ ДЛЯ ОПТИМІЗАЦІЇ АВАТАРА
    const getResizedAvatarUrl = (url) => {
        if (!url) return null;
        
        // Замінюємо /object/ на /render/image/ для активації трансформацій
        let transformedUrl = url.replace('/object/', '/render/image/');
        
        // Параметри для зміни розміру
        const resizeParams = 'width=128&height=128&resize=cover';
        
        // Перевіряємо, чи є в URL вже інші параметри (починаються з "?")
        if (transformedUrl.includes('?')) {
            // Якщо так, додаємо наші параметри через "&"
            return `${transformedUrl}&${resizeParams}`;
        } else {
            // Якщо ні, додаємо через "?"
            return `${transformedUrl}?${resizeParams}`;
        }
    };

    const avatarSource = item.passenger_avatar_url 
        ? { uri: getResizedAvatarUrl(item.passenger_avatar_url) } 
        : require('../assets/default-avatar.jpg');

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {/* Верхній блок: Аватар та деталі */}
            <View style={styles.cardTop}>
                <Image 
                    source={avatarSource} 
                    style={styles.avatar}
                />
                <View style={styles.infoContainer}>
                    <Text style={styles.passengerName} numberOfLines={1}>{getShortName(item.passenger_name)}</Text>
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="calendar-outline" size={14} /> Дата</Text>
                            <Text style={styles.detailValue}>{moment(item.transfer_datetime).format('DD MMMM')}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="time-outline" size={14} /> Час</Text>
                            <Text style={styles.detailValue}>{moment(item.transfer_datetime).format('HH:mm')}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}><Ionicons name="people-outline" size={14} /> Осіб</Text>
                            <Text style={styles.detailValue}>{item.passenger_count}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Розділювач */}
            <View style={styles.dividerContainer}>
                <View style={styles.dividerDotStart} />
                <View style={styles.dividerLine} />
                <View style={styles.dividerDotEnd} />
            </View>

            {/* Нижній блок: Маршрут */}
            <View style={styles.routeContainer}>
                <View style={styles.locationRow}>
                    <View style={[styles.routeCircle, styles.startCircle]} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text>
                </View>
                <View style={styles.routeDottedLine} />
                <View style={styles.locationRow}>
                    <View style={[styles.routeCircle, styles.endCircle]} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};


export default function DriverHomeScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const styles = getStyles(colors, theme);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
        const { data, error } = await supabase.rpc('get_pending_transfers');
        if (error) throw error;
        setRequests(data);
    } catch (error) {
        console.error("Error fetching transfer requests:", error.message);
    }
  }, []);

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await fetchRequests();
      setRefreshing(false);
  }, [fetchRequests]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchRequests().finally(() => setLoading(false));
  }, [fetchRequests]));

  if (loading) {
      return (
          <SafeAreaView style={styles.container}>
              <View style={styles.header}><Text style={styles.title}>{t('driverHome.title', 'Доступні заявки')}</Text><Logo width={40} height={40} /></View>
              <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('driverHome.title', 'Доступні заявки')}</Text>
        <Logo width={40} height={40} />
      </View>
      <FlatList
        data={requests}
        renderItem={({ item }) => (
            <TransferRequestCard 
                item={item} 
                onPress={() => navigation.navigate('DriverRequest', { transferId: item.id })}
            />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
            <View style={styles.content}>
                <Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} />
                <Text style={styles.text}>{t('driverHome.noRequests', 'Наразі немає доступних заявок.')}</Text>
            </View>
        }
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </SafeAreaView>
  );
}

// ✨ ПОВНІСТЮ ОНОВЛЕНІ СТИЛІ
const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 100,
    },
    text: {
        fontSize: 18,
        color: colors.secondaryText,
        textAlign: 'center',
        marginTop: 16,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme === 'light' ? 0.1 : 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginRight: 16,
        backgroundColor: colors.background,
    },
    infoContainer: {
        flex: 1,
    },
    passengerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
    },
    detailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        alignItems: 'center',
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: colors.secondaryText,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerDotStart: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.secondaryText,
    },
    dividerDotEnd: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.secondaryText,
    },
    dividerLine: {
        flex: 1,
        height: 2,
        borderBottomWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
    },
    routeContainer: {
        paddingLeft: 24, // Відступ для вертикальної лінії
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: colors.text,
        fontSize: 16,
        marginLeft: 16,
    },
    routeDottedLine: {
        height: 20,
        width: 2,
        borderLeftWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border,
        marginLeft: 5, 
        marginVertical: 4,
    },
    routeCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    startCircle: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.secondaryText,
    },
    endCircle: {
        backgroundColor: colors.secondaryText,
    },
});
