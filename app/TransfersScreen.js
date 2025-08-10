// app/TransfersScreen.js
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import moment from 'moment';
import 'moment/locale/uk';
import Logo from '../assets/icon.svg';

const statusDetails = {
  pending: { text: 'Пошук водія', color: '#0288D1', icon: 'hourglass-outline' },
  accepted: { text: 'Водія знайдено', color: '#2E7D32', icon: 'checkmark-circle-outline' },
  completed: { text: 'Завершено', color: '#4CAF50', icon: 'checkmark-done-outline' },
  cancelled: { text: 'Скасовано', color: '#8A8A8A', icon: 'ban-outline' },
};

// ✨ КОМПОНЕНТ КАРТКИ ТЕПЕР ПРИЙМАЄ `navigation`
const TransferCard = ({ item, navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const status = statusDetails[item.status] || statusDetails.pending;

  const handleCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(err => Alert.alert("Не вдалося виконати дзвінок", err.toString()));
    }
  };

  // ✨ ОНОВЛЕНА ФУНКЦІЯ ДЛЯ ПЕРЕХОДУ В ЧАТ
  const handleMessage = () => {
    if (item.driver_id) {
      // Переходимо на вкладку повідомлень, а звідти на екран індивідуального чату,
      // передаючи дані про водія.
      navigation.navigate('MessagesTab', {
        screen: 'IndividualChat', // Переконайтесь, що назва екрана чату правильна
        params: {
          recipientId: item.driver_id,
          recipientName: item.driver_name,
          recipientAvatar: item.driver_avatar_url,
        },
      });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
        <Text style={styles.dateText}>{moment(item.transfer_datetime).format('D MMMM, HH:mm')}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}><View style={styles.routeIconContainer}><Ionicons name="airplane-outline" size={20} color={colors.secondaryText} /></View><Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text></View>
        <View style={styles.dottedLine} />
        <View style={styles.locationRow}><View style={styles.routeIconContainer}><Ionicons name="location-outline" size={20} color={colors.secondaryText} /></View><Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text></View>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.pendingFooter}><Ionicons name="notifications-outline" size={18} color={colors.secondaryText} /><Text style={styles.pendingFooterText}>Очікуємо на пропозиції від водіїв</Text></View>
      )}

      {(item.status === 'accepted' || item.status === 'completed') && item.driver_name && (
        <View style={styles.driverFooter}>
          <View style={styles.driverInfo}>
            <Image source={item.driver_avatar_url ? { uri: item.driver_avatar_url } : require('../assets/default-avatar.png')} style={styles.driverAvatar} />
            <View>
              <Text style={styles.driverName}>{item.driver_name}</Text>
              <Text style={styles.driverCar}>{item.car_make} {item.car_model} · <Text style={styles.carPlate}>{item.car_plate}</Text></Text>
            </View>
          </View>
          {item.status === 'accepted' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.driver_phone)}>
                <Ionicons name="call" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              {/* ✨ КНОПКА ТЕПЕР ВИКЛИКАЄ НОВУ ФУНКЦІЮ */}
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                <Text style={styles.messageButtonText}>Написати</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default function TransfersScreen({ navigation }) {
  const { colors } = useTheme();
  const { session } = useAuth();
  const styles = getStyles(colors);
  
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_transfers', { p_id: session.user.id });
      if (error) throw error;
      setTransfers(data);
    } catch (error) { console.error("Error fetching transfers:", error.message); } 
    finally { setLoading(false); }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchTransfers(); }, [fetchTransfers]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>Мої трансфери</Text><Logo width={40} height={40} /></View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Мої трансфери</Text><Logo width={40} height={40} /></View>
      <FlatList
        data={transfers}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('TransferDetail', { transferId: item.id })}
            disabled={item.status === 'cancelled'}
            style={item.status === 'cancelled' && styles.disabledCard}
          >
            {/* ✨ ПЕРЕДАЄМО `navigation` В КОМПОНЕНТ КАРТКИ */}
            <TransferCard item={item} navigation={navigation} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} /><Text style={styles.emptyText}>У вас ще немає створених заявок.</Text></View>}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  disabledCard: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  dateText: { fontSize: 14, color: colors.secondaryText },
  routeContainer: {},
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  routeIconContainer: { width: 30, alignItems: 'center' },
  locationText: { color: colors.text, fontSize: 16, marginLeft: 12, fontWeight: '500' },
  dottedLine: { height: 24, width: 2, backgroundColor: colors.border, marginLeft: 14, marginVertical: 4 },
  pendingFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  pendingFooterText: { color: colors.secondaryText, fontSize: 14, marginLeft: 8, fontStyle: 'italic' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: colors.secondaryText, fontSize: 16, marginTop: 16, textAlign: 'center' },
  driverFooter: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  driverName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  driverCar: { color: colors.secondaryText, fontSize: 14, marginTop: 2 },
  carPlate: { color: colors.text, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  callButton: { backgroundColor: colors.primary, borderRadius: 12, flex: 1, marginRight: 8, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  messageButton: { backgroundColor: `${colors.primary}20`, borderRadius: 12, flex: 2, marginLeft: 8, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  messageButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
});
