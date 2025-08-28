import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import moment from 'moment';
import 'moment/locale/uk';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';

const statusDetails = (t) => ({
  pending: { text: t('transferStatus.pending', 'Пошук водія'), color: '#0288D1', icon: 'hourglass-outline' },
  accepted: { text: t('transferStatus.accepted', 'Водія знайдено'), color: '#2E7D32', icon: 'checkmark-circle-outline' },
  completed: { text: t('transferStatus.completed', 'Завершено'), color: '#4CAF50', icon: 'checkmark-done-outline' },
  cancelled: { text: t('transferStatus.cancelled', 'Скасовано'), color: '#8A8A8A', icon: 'ban-outline' },
});

const TransferCard = ({ item, onSelect, onLongPress, isSelected, selectionMode }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const { session } = useAuth();
  const { t } = useTranslation();
  const status = statusDetails(t)[item.status] || statusDetails(t).pending;
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const handlePress = () => {
    if (selectionMode) {
      onSelect(item.id);
    } else {
      navigation.navigate('TransferDetail', { transferId: item.id });
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) { Alert.alert(t('alerts.phoneNotFoundTitle'), t('alerts.phoneNotFoundBody')); return; }
    const url = `tel:${phoneNumber}`;
    Alert.alert( t('alerts.confirmCallTitle'), t('alerts.confirmCallBody', { phoneNumber }), [ { text: t('alerts.cancelButton'), style: "cancel" }, { text: t('alerts.callButton'), onPress: () => { Linking.openURL(url).catch(() => Alert.alert(t('alerts.errorTitle'), t('alerts.callFailedCheckDevice'))); } } ]);
  };

  const handleMessage = async () => {
    if (!item.driver_id || !session?.user?.id) return;
    setIsCreatingChat(true);
    try {
      const { data: roomId, error } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: item.driver_id });
      if (error) throw error;
      navigation.navigate('MessagesTab', { screen: 'IndividualChat', params: { roomId, recipientId: item.driver_id, recipientName: item.driver_name, recipientAvatar: item.driver_avatar_url } });
    } catch (error) { Alert.alert(t('alerts.errorTitle'), t('alerts.chatFailed')); console.error("Error finding or creating chat room:", error); } 
    finally { setIsCreatingChat(false); }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={200}
      style={[
        styles.card,
        (item.status === 'completed' || item.status === 'cancelled') && styles.archivedCard,
        isSelected && styles.selectedCard
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}><Ionicons name={status.icon} size={14} color={status.color} /><Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text></View>
        <Text style={styles.dateText}>{moment(item.transfer_datetime).format(t('timeFormats.cardDate', 'D MMMM, HH:mm'))}</Text>
      </View>
      <View style={styles.routeContainer}>
        <View style={styles.locationRow}><View style={styles.routeIconContainer}><Ionicons name="airplane-outline" size={20} color={colors.secondaryText} /></View><Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text></View>
        <View style={styles.dottedLine} />
        <View style={styles.locationRow}><View style={styles.routeIconContainer}><Ionicons name="location-outline" size={20} color={colors.secondaryText} /></View><Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text></View>
      </View>
      
      {(item.status === 'accepted' || item.status === 'completed') && item.accepted_price && (
        <View style={styles.priceFooter}>
          <Text style={styles.priceLabel}>{t('transfersScreen.finalPrice', 'Фінальна ціна')}</Text>
          <Text style={styles.priceValue}>{`${item.accepted_price} ${item.accepted_currency}`}</Text>
        </View>
      )}

      {item.status === 'pending' && ( <View style={styles.pendingFooter}><Ionicons name="notifications-outline" size={18} color={colors.secondaryText} /><Text style={styles.pendingFooterText}>{t('transferCard.pendingFooter', 'Очікуємо на пропозиції від водіїв')}</Text>{item.unread_offers_count > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{item.unread_offers_count}</Text></View>)}</View> )}
      
      {(item.status === 'accepted' || item.status === 'completed') && item.driver_name && (
        <View style={styles.driverFooter}>
          <View style={styles.driverInfo}><Image source={item.driver_avatar_url ? { uri: item.driver_avatar_url } : require('../assets/default-avatar.png')} style={styles.driverAvatar} /><View><Text style={styles.driverName}>{item.driver_name}</Text><Text style={styles.driverCar}>{item.car_make} {item.car_model} · <Text style={styles.carPlate}>{item.car_plate}</Text></Text></View></View>
          {item.status === 'accepted' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.driver_phone)}><Ionicons name="call" size={20} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage} disabled={isCreatingChat}>{isCreatingChat ? <ActivityIndicator size="small" color={colors.primary} /> : <><Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} /><Text style={styles.messageButtonText}>{t('transfersScreen.writeButton', 'Написати')}</Text></> }</TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {isSelected && (
        <View style={styles.selectionOverlay}>
            <Ionicons name="checkmark-circle" size={32} color={'#fff'} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function TransfersScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const styles = getStyles(colors);
  const { t } = useTranslation();
  
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const fetchTransfers = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      const { error: updateError } = await supabase.rpc('auto_complete_transfers', { p_id: session.user.id });
      if (updateError) throw updateError;

      const { data, error } = await supabase.rpc('get_my_transfers', { p_id: session.user.id });
      if (error) throw error;
      setTransfers(data || []);
    } catch (error) { console.error("Error fetching transfers:", error.message); } 
    finally { setLoading(false); }
  }, [session]);

  useFocusEffect(useCallback(() => { fetchTransfers(); }, [fetchTransfers]));

  const { activeTransfers, archivedTransfers } = useMemo(() => {
    const active = transfers.filter(t => t.status === 'pending' || t.status === 'accepted');
    const archived = transfers.filter(t => t.status === 'completed' || t.status === 'cancelled');
    return { activeTransfers: active, archivedTransfers: archived };
  }, [transfers]);

  const handleToggleSelection = (id) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
    if (newSelection.size === 0) {
      setSelectionMode(false);
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      t('transfersScreen.deleteConfirmTitle', 'Видалити трансфери?'),
      t('transfersScreen.deleteConfirmBody', { count: selectedItems.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('transfers').delete().in('id', Array.from(selectedItems));
            if (error) {
              Alert.alert(t('common.error'), error.message);
            } else {
              setTransfers(prev => prev.filter(t => !selectedItems.has(t.id)));
              setSelectionMode(false);
              setSelectedItems(new Set());
            }
        }}
      ]
    );
  };
  
  const Header = () => (
    <View style={styles.header}>
        <Text style={styles.title}>{viewMode === 'active' ? t('transfersScreen.title', 'Мої трансфери') : t('transfersScreen.archiveTitle', 'Архів')}</Text>
        <TouchableOpacity onPress={() => { setViewMode(prev => prev === 'active' ? 'archived' : 'active'); setSelectionMode(false); setSelectedItems(new Set()); }}>
            <Ionicons name={viewMode === 'active' ? "archive-outline" : "file-tray-full-outline"} size={26} color={colors.text} />
        </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={viewMode === 'active' ? activeTransfers : archivedTransfers}
          renderItem={({ item }) => (
            <TransferCard 
                item={item} 
                selectionMode={selectionMode}
                isSelected={selectedItems.has(item.id)}
                onSelect={handleToggleSelection}
                onLongPress={() => {
                  if (viewMode === 'archived') {
                    setSelectionMode(true);
                    handleToggleSelection(item.id);
                  }
                }}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={64} color={colors.secondaryText} />
                <Text style={styles.emptyText}>
                    {viewMode === 'active' ? t('transfersScreen.emptyState', 'У вас ще немає створених заявок.') : t('transfersScreen.emptyArchive', 'Ваш архів порожній.')}
                </Text>
            </View>
          }
        />
      )}

      {selectionMode && (
        <View style={styles.footerActions}>
            <TouchableOpacity style={styles.footerButton} onPress={() => { setSelectionMode(false); setSelectedItems(new Set()); }}>
                <Text style={styles.footerButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerButton, styles.deleteButton]} onPress={handleDeleteSelected}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={[styles.footerButtonText, styles.deleteButtonText]}>{t('common.delete')}</Text>
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  archivedCard: { opacity: 0.7 },
  selectedCard: { borderColor: colors.primary, borderWidth: 2, transform: [{ scale: 0.98 }] },
  selectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 132, 255, 0.3)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  dateText: { fontSize: 14, color: colors.secondaryText },
  routeContainer: {},
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  routeIconContainer: { width: 30, alignItems: 'center' },
  locationText: { color: colors.text, fontSize: 16, marginLeft: 12, fontWeight: '500' },
  dottedLine: { height: 24, width: 2, backgroundColor: colors.border, marginLeft: 14, marginVertical: 4 },
  pendingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  pendingFooterText: { color: colors.secondaryText, fontSize: 14, fontStyle: 'italic' },
  badge: { backgroundColor: '#D32F2F', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 20 },
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
  priceFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: colors.secondaryText },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  footerActions: { flexDirection: 'row', padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, },
  footerButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.background },
  footerButtonText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#D32F2F', marginLeft: 10, flexDirection: 'row', gap: 8 },
  deleteButtonText: { color: '#fff' },
});