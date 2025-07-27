import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext'; 
import Logo from '../assets/icon.svg'; 

// Мокові дані, що імітують список трансферів з вашого дизайну
const mockTransfers = [
  {
    id: '1',
    status: 'driver_selected',
    date: '17 липня, 14:30',
    from: 'Польща - Аеропорт',
    to: 'Львів - Центральна Площа',
    driver: 'Іван',
    car: 'Merc. Sprinter',
    plate: 'BC 0000 AE',
  },
  {
    id: '2',
    status: 'scheduled',
    date: '18 липня, 14:30',
    from: 'Польща - Аеропорт',
    to: 'Львів - Центральна Площа',
    newOffers: 2,
  },
  {
    id: '3',
    status: 'completed',
    date: '14 липня, 10:20',
    from: 'Франція - Аеропорт',
    to: 'Чернівці - ЖД Вокзал',
    driver: 'Ігор',
    car: 'Renault Trafic',
    plate: 'AC 1111 VB',
  },
  {
    id: '4',
    status: 'cancelled',
    date: '10 липня, 09:00',
    from: 'Київ - Аеропорт',
    to: 'Буковель - Готель',
  },
];

// Об'єкт для налаштувань статусу (текст, колір, іконка)
const statusDetails = {
  driver_selected: {
    text: 'Обрано водія',
    color: '#2E7D32',
    icon: 'ellipse',
  },
  scheduled: {
    text: 'Заплановано',
    color: '#FFC107',
    icon: 'sunny',
  },
  completed: {
    text: 'Завершено',
    color: '#4CAF50',
    icon: 'checkmark-circle',
  },
  cancelled: {
    text: 'Скасовано',
    color: '#8A8A8A',
    icon: 'ban-outline',
  },
};

// Компонент для однієї картки трансферу
const TransferCard = ({ item }) => {
  const { colors } = useTheme(); 
  const styles = getStyles(colors);
  const status = statusDetails[item.status];

  return (
    <View style={[styles.card, item.status === 'cancelled' && styles.disabledCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          <Ionicons name={status.icon} size={16} color={status.color} style={{ marginRight: 8 }} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
        <Text style={styles.dateText}>{item.date}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <Ionicons name="airplane-outline" size={20} color={colors.secondaryText} />
          <Text style={styles.locationText}>{item.from}</Text>
        </View>
        <View style={styles.dottedLine} />
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
          <Text style={styles.locationText}>{item.to}</Text>
        </View>
      </View>

      {(item.status === 'scheduled' || item.status === 'driver_selected' || item.status === 'completed') && (
        <View style={styles.cardFooter}>
          {item.status === 'scheduled' && (
            <View style={styles.offerContainer}>
              <Text style={styles.offerText}>Нові пропозиції</Text>
              <Ionicons name="mail" size={20} color={colors.secondaryText} style={{ marginHorizontal: 8 }} />
              {item.newOffers > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.newOffers}</Text>
                </View>
              )}
            </View>
          )}
          {(item.status === 'driver_selected' || item.status === 'completed') && (
            <View style={styles.driverInfo}>
              <Ionicons name="person-outline" size={16} color={colors.secondaryText} />
              <Text style={styles.driverText}>{item.driver}</Text>
              <Ionicons name="car-sport-outline" size={16} color={colors.secondaryText} style={{ marginLeft: 12 }} />
              <Text style={styles.driverText}>{`${item.car} номер: ${item.plate}`}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Основний компонент екрана
export default function TransfersScreen({ navigation }) { // ✨ ДОДАНО ПРОПС NAVIGATION
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мої трансфери</Text>
            <Logo width={40} height={40} />
      </View>
      <FlatList
        data={mockTransfers}
        renderItem={({ item }) => (
          // ✨ КАРТКА ТЕПЕР КЛІКАБЕЛЬНА
          <TouchableOpacity
            onPress={() => navigation.navigate('TransferDetail', { 
              transferId: item.id, 
              status: item.status 
            })}
            disabled={item.status === 'cancelled'} // Вимикаємо натискання для скасованих
          >
            <TransferCard item={item} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </SafeAreaView>
  );
}

// Усі стилі для екрана
const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  // ✨ СТИЛЬ ДЛЯ НЕАКТИВНОЇ КАРТКИ
  disabledCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  routeContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    color: colors.text,
    fontSize: 16,
    marginLeft: 12,
  },
  dottedLine: {
    height: 20,
    width: 1,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.secondaryText,
    marginLeft: 9, 
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverText: {
    color: colors.text,
    fontSize: 14,
    marginLeft: 8,
  },
  offerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerText: {
    color: colors.text,
    fontSize: 16,
  },
  badge: {
    backgroundColor: '#D32F2F', 
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});