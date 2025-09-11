import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import moment from 'moment';
import 'moment/locale/uk';
import { useTranslation } from 'react-i18next';

const getDisplayStatus = (item, t) => {
  switch (item.status) {
    case 'pending':
      if (item.offers_count > 0) {
        return { title: t('transferStatus.offersAvailable.title'), text: t('transferStatus.offersAvailable.text'), color: '#FFA000', icon: 'notifications-circle-outline' };
      }
      return { title: t('transferStatus.pending.title'), text: t('transferStatus.pending.text'), color: '#0288D1', icon: 'hourglass-outline' };
    case 'accepted':
      return { title: t('transferStatus.accepted.title'), text: t('transferStatus.accepted.text'), color: '#2E7D32', icon: 'shield-checkmark-outline' };
    case 'completed':
      return { title: t('transferStatus.completed.title'), text: t('transferStatus.completed.text'), color: '#4CAF50', icon: 'checkmark-done-outline' };
    case 'cancelled':
      return { title: t('transferStatus.cancelled.title'), text: t('transferStatus.cancelled.text'), color: '#8A8A8A', icon: 'ban-outline' };
    default:
      return { title: '', text: '', color: '#8A8A8A', icon: 'help-circle-outline' };
  }
};

const TransferCard = ({ item, onSelect, onLongPress, isSelected, selectionMode }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  const { session } = useAuth();
  const { t } = useTranslation();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const displayStatus = getDisplayStatus(item, t);

  const handlePress = () => {
    if (selectionMode) { onSelect(item.id); } 
    else { navigation.navigate('TransferDetail', { transferId: item.id }); }
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
      style={[ styles.card, (item.status === 'completed' || item.status === 'cancelled') && styles.archivedCard, isSelected && styles.selectedCard ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{moment(item.transfer_datetime).format('D MMMM, HH:mm')}</Text>
        
        {item.status === 'pending' && item.offers_count > 0 && (
          <View style={[
            styles.badgeBase,
            item.unread_offers_count > 0 
              ? styles.badgeUnread
              : styles.badgeTotal
          ]}>
            <Text style={styles.badgeText}>{item.offers_count}</Text>
          </View>
        )}
      </View>
      
      {/* ✨ ЗМІНИ ТУТ: Умовне відображення іконок */}
      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <View style={styles.routeIconContainer}>
            <Ionicons 
              name={item.direction === 'from_airport' ? 'airplane-outline' : 'location-outline'} 
              size={20} 
              color={colors.secondaryText} 
            />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>{item.from_location}</Text>
        </View>
        <View style={styles.dottedLine} />
        <View style={styles.locationRow}>
          <View style={styles.routeIconContainer}>
            <Ionicons 
              name={item.direction === 'to_airport' ? 'airplane-outline' : 'location-outline'} 
              size={20} 
              color={colors.secondaryText} 
            />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>{item.to_location}</Text>
        </View>
      </View>
      {/* ✨ КІНЕЦЬ ЗМІН */}
      
      <View style={[styles.statusInfoBox, { backgroundColor: `${displayStatus.color}1A`, borderColor: displayStatus.color }]}>
        <Ionicons name={displayStatus.icon} size={24} color={displayStatus.color} />
        <View style={styles.statusInfoTextBox}>
            <Text style={[styles.statusInfoTitle, { color: displayStatus.color }]}>{displayStatus.title}</Text>
            <Text style={[styles.statusInfoText, { color: colors.secondaryText }]}>{displayStatus.text}</Text>
        </View>
      </View>
      
      {(item.status === 'accepted' || item.status === 'completed') && item.driver_name && (
        <View style={styles.driverFooter}>
          {item.accepted_price && (
            <View style={styles.priceFooter}>
              <Text style={styles.priceLabel}>{t('transfersScreen.finalPrice')}</Text>
              <Text style={styles.priceValue}>{`${item.accepted_price} ${item.accepted_currency || t('common.currency_uah')}`}</Text>
            </View>
          )}

          <View style={styles.driverInfo}>
            <Image 
                source={item.driver_avatar_url ? { uri: item.driver_avatar_url } : require('../assets/default-avatar.png')} 
                style={styles.driverAvatar}
                contentFit="cover"
                transition={300}
                cachePolicy="disk"
            />
            <View><Text style={styles.driverName}>{item.driver_name}</Text><Text style={styles.driverCar}>{item.car_make} {item.car_model} · <Text style={styles.carPlate}>{item.car_plate}</Text></Text></View>
          </View>
          {item.status === 'accepted' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.driver_phone)}><Ionicons name="call" size={20} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage} disabled={isCreatingChat}>{isCreatingChat ? <ActivityIndicator size="small" color={colors.primary} /> : <><Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} /><Text style={styles.messageButtonText}>{t('transfersScreen.writeButton')}</Text></> }</TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {isSelected && (<View style={styles.selectionOverlay}><Ionicons name="checkmark-circle" size={32} color={'#fff'} /></View>)}
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
  const [viewMode, setViewMode] = useState('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState(null);

  const fetchTransfers = useCallback(async () => {
    if (!session?.user) { 
      setLoading(false); 
      return; 
    }
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.rpc('get_my_transfers', { p_id: session.user.id });
      if (fetchError) throw fetchError;
      setTransfers(data || []);
    } catch (err) {
        console.error("Error fetching transfers:", err.message);
        setError(err.message);
    } finally { 
      setLoading(false); 
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      if(session?.user){
        setLoading(true);
        fetchTransfers();
      }
    }, [fetchTransfers, session])
  );

  useEffect(() => {
    if (!session?.user) {
        setTransfers([]);
        return;
    }

    const transfersSubscription = supabase
        .channel('passenger-transfers-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'transfers', filter: `passenger_id=eq.${session.user.id}` },
            (payload) => {
                console.log('Зміна в таблиці TRANSFERS! Оновлюємо список...');
                fetchTransfers(); 
            }
        )
        .subscribe();

    const offersSubscription = supabase
        .channel('passenger-offers-channel')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'transfer_offers' },
            (payload) => {
                console.log('Зміна в таблиці TRANSFER_OFFERS! Оновлюємо список...');
                fetchTransfers();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(transfersSubscription);
        supabase.removeChannel(offersSubscription);
    };
  }, [session, fetchTransfers]);

  const { activeTransfers, archivedTransfers } = useMemo(() => {
    const active = transfers.filter(t => t.status === 'pending' || t.status === 'accepted');
    const archived = transfers.filter(t => t.status === 'completed' || t.status === 'cancelled');
    return { activeTransfers: active, archivedTransfers: archived };
  }, [transfers]);

  const handleToggleSelection = (id) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) { newSelection.delete(id); } else { newSelection.add(id); }
    setSelectedItems(newSelection);
    if (newSelection.size === 0) { setSelectionMode(false); }
  };

  const handleDeleteSelected = () => {
    Alert.alert( t('transfersScreen.deleteConfirmTitle'), t('transfersScreen.deleteConfirmBody', { count: selectedItems.size }), [ { text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('transfers').delete().in('id', Array.from(selectedItems));
            if (error) { Alert.alert(t('common.error'), error.message); } else {
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
        <Text style={styles.title}>{viewMode === 'active' ? t('transfersScreen.title') : t('transfersScreen.archiveTitle')}</Text>
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
      ) : error ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color={colors.secondaryText} />
            <Text style={styles.errorTitle}>{t('common.error')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchTransfers} style={styles.retryButton}><Text style={styles.retryButtonText}>{t('common.retry')}</Text></TouchableOpacity>
        </View>
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
                <Text style={styles.emptyText}>{viewMode === 'active' ? t('transfersScreen.emptyState') : t('transfersScreen.emptyArchive')}</Text>
            </View>
          }
        />
      )}

      {selectionMode && (
        <View style={styles.footerActions}>
            <TouchableOpacity style={styles.footerButton} onPress={() => { setSelectionMode(false); setSelectedItems(new Set()); }}><Text style={styles.footerButtonText}>{t('common.cancel')}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.footerButton, styles.deleteButton]} onPress={handleDeleteSelected}><Ionicons name="trash-outline" size={20} color="#fff" /><Text style={[styles.footerButtonText, styles.deleteButtonText]}>{t('common.delete')}</Text></TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateText: { fontSize: 14, color: colors.secondaryText },
  routeContainer: {},
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  routeIconContainer: { width: 30, alignItems: 'center' },
  locationText: { color: colors.text, fontSize: 16, marginLeft: 12, fontWeight: '500' },
  dottedLine: { height: 24, width: 2, backgroundColor: colors.border, marginLeft: 14, marginVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  badgeBase: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 'auto'
  },
  badgeUnread: {
    backgroundColor: '#D32F2F',
  },
  badgeTotal: {
    backgroundColor: '#0288D1',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 20 },
  emptyText: { color: colors.secondaryText, fontSize: 16, marginTop: 16, textAlign: 'center' },
  driverFooter: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  driverInfo: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  driverName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  driverCar: { color: colors.secondaryText, fontSize: 14, marginTop: 2 },
  carPlate: { color: colors.text, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  callButton: { backgroundColor: colors.primary, borderRadius: 12, flex: 1, marginRight: 8, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  messageButton: { backgroundColor: `${colors.primary}20`, borderRadius: 12, flex: 2, marginLeft: 8, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  messageButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  footerActions: { flexDirection: 'row', padding: 16, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  footerButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.background },
  footerButtonText: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#D32F2F', marginLeft: 10, flexDirection: 'row', gap: 8 },
  deleteButtonText: { color: '#fff' },
  statusInfoBox: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, gap: 12, },
  statusInfoTextBox: { flex: 1 },
  statusInfoTitle: { fontSize: 15, fontWeight: 'bold' },
  statusInfoText: { fontSize: 13, marginTop: 2 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: 16, textAlign: 'center' },
  errorText: { color: colors.secondaryText, fontSize: 16, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { marginTop: 20, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  priceFooter: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 14, color: colors.secondaryText },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
});