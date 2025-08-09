// app/TransfersScreen.js
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import moment from 'moment';
import 'moment/locale/uk';
import Logo from '../assets/icon.svg';

const statusDetails = {
  pending: { 
    text: 'Пошук водія', 
    color: '#0288D1',
    icon: 'hourglass-outline' 
  },
  completed: { 
    text: 'Завершено', 
    color: '#4CAF50', 
    icon: 'checkmark-done-outline' 
  },
  cancelled: { 
    text: 'Скасовано', 
    color: '#8A8A8A', 
    icon: 'ban-outline' 
  },
};

const TransferCard = ({ item }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const status = statusDetails[item.status] || statusDetails.pending;

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
        <View style={styles.locationRow}>
          <View style={styles.routeIconContainer}>
            <Ionicons name="airplane-outline" size={20} color={colors.secondaryText} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text>
        </View>
        <View style={styles.dottedLine} />
        <View style={styles.locationRow}>
          <View style={styles.routeIconContainer}>
            <Ionicons name="location-outline" size={20} color={colors.secondaryText} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.pendingFooter}>
          <Ionicons name="notifications-outline" size={18} color={colors.secondaryText} />
          <Text style={styles.pendingFooterText}>Очікуємо на пропозиції від водіїв</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>Мої трансфери</Text>
        <Logo width={40} height={40} />
      </View>
      <FlatList
        data={transfers}
        renderItem={({ item }) => (
          // ✨ ОСЬ ТУТ ДОДАНО НАВІГАЦІЮ ✨
          <TouchableOpacity
            onPress={() => navigation.navigate('TransferDetail', { transferId: item.id })}
            disabled={item.status === 'cancelled'}
            style={item.status === 'cancelled' && styles.disabledCard}
          >
            <TransferCard item={item} />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.emptyText}>У вас ще немає створених заявок.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledCard: { opacity: 0.6 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  dateText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  routeContainer: {},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 30,
    alignItems: 'center',
  },
  locationText: {
    color: colors.text,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  dottedLine: {
    height: 24,
    width: 2,
    backgroundColor: colors.border,
    marginLeft: 14, 
    marginVertical: 4,
  },
  pendingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingFooterText: {
    color: colors.secondaryText,
    fontSize: 14,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
