import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Animated, RefreshControl, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { MotiView } from 'moti';

// --- НОВІ КОМПОНЕНТИ ---

// Контекстне меню при довгому натисканні на обраний контакт
const ContextMenuModal = ({ visible, onClose, user, onAction }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    
    if (!user) return null;

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
                <MotiView from={{ opacity: 0, translateY: 50 }} animate={{ opacity: 1, translateY: 0 }} style={styles.contextMenu}>
                    <View style={styles.contextMenuHeader}>
                        <Image source={user.other_participant_avatar ? { uri: user.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.contextAvatar} />
                        <Text style={styles.contextUserName}>{user.other_participant_name}</Text>
                    </View>
                    <TouchableOpacity style={styles.contextMenuItem} onPress={() => { onClose(); onAction('open'); }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.text} />
                        <Text style={styles.contextMenuItemText}>{t('chatList.contextMenu.openChat')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextMenuItem} onPress={() => { onClose(); onAction('favorite'); }}>
                        <Ionicons name={user.is_favorite ? "star" : "star-outline"} size={22} color={colors.text} />
                        <Text style={styles.contextMenuItemText}>{user.is_favorite ? t('chatList.contextMenu.removeFromFavorites') : t('chatList.contextMenu.addToFavorites')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextMenuItem} onPress={() => { onClose(); onAction('delete'); }}>
                        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                        <Text style={[styles.contextMenuItemText, { color: '#FF3B30' }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                </MotiView>
            </TouchableOpacity>
        </Modal>
    );
};


// ✅ ОНОВЛЕНИЙ КОМПОНЕНТ: Горизонтальний список обраних чатів
const FavoriteBar = React.memo(({ chats, onlineUsers, onLongPress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    if (!chats || chats.length === 0) return null;

    const renderFavorite = ({ item, index }) => {
        const isOnline = onlineUsers.has(item.other_participant_id);
        return (
            <TouchableOpacity
                style={styles.favoriteItem}
                onPress={() => navigation.navigate('IndividualChat', {
                    roomId: item.room_id, recipientId: item.other_participant_id, recipientName: item.other_participant_name,
                    recipientAvatar: item.other_participant_avatar, recipientLastSeen: item.other_participant_last_seen,
                })}
                onLongPress={() => onLongPress(item)}
            >
                <View>
                    <Image source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.favoriteAvatar} />
                    {isOnline && <View style={styles.onlineIndicator} />}
                    {/* Додаємо індикатор непрочитаних повідомлень */}
                    {item.unread_count > 0 && (
                        <View style={styles.favoriteBadge}>
                            <Text style={styles.favoriteBadgeText}>
                                {item.unread_count > 9 ? '9+' : item.unread_count}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.favoriteName} numberOfLines={1}>{item.other_participant_name.split(' ')[0]}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.favoritesContainer}>
            <FlatList
                data={chats}
                renderItem={renderFavorite}
                keyExtractor={item => item.room_id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );
});


// Скелетон для початкового завантаження
const SkeletonChatItem = () => { /* ...код без змін... */ };

// Оновлений компонент елемента списку чатів
const ChatItem = React.memo(({ item, index, currentUserId, onDelete, onToggleFavorite, onlineUsers }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    const swipeableRef = useRef(null);

    const isMyLastMessage = item.last_message_sender_id === currentUserId;
    const isRead = item.last_message_status === 'read';
    const isOnline = onlineUsers.has(item.other_participant_id);

    const renderRightActions = () => ( <TouchableOpacity style={styles.deleteButton} onPress={() => { swipeableRef.current?.close(); onDelete(item); }}><Ionicons name="trash-outline" size={26} color="#fff" /></TouchableOpacity> );
    const renderLeftActions = () => ( <TouchableOpacity style={styles.favoriteButton} onPress={() => { swipeableRef.current?.close(); onToggleFavorite(item); }}><Ionicons name={item.is_favorite ? "star" : "star-outline"} size={26} color="#fff" /></TouchableOpacity> );
    
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }).start(); }, []);

    return (
        <Animated.View style={{ opacity: anim }}>
            <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} renderLeftActions={renderLeftActions}>
                <TouchableOpacity
                    style={styles.chatItemCard} activeOpacity={0.8}
                    onPress={() => navigation.navigate('IndividualChat', {
                        roomId: item.room_id, recipientId: item.other_participant_id, recipientName: item.other_participant_name,
                        recipientAvatar: item.other_participant_avatar, recipientLastSeen: item.other_participant_last_seen,
                    })}
                >
                    <View style={styles.avatarContainer}>
                        <Image source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.avatar} contentFit="cover" transition={300} cachePolicy="disk" />
                        {isOnline && <View style={styles.onlineIndicatorSmall} />}
                    </View>
                    <View style={styles.chatContent}>
                        <View style={styles.chatHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1}}>
                                {item.is_favorite && <Ionicons name="star" size={16} color="#FFC700" style={{marginRight: 6}} />}
                                <Text style={styles.userName} numberOfLines={1}>{item.other_participant_name || 'User'}</Text>
                            </View>
                            <Text style={styles.time}>{item.last_message_time ? moment(item.last_message_time).fromNow(true) : ''}</Text>
                        </View>
                        <View style={styles.chatFooter}>
                            <View style={styles.lastMessageContainer}>
                                {isMyLastMessage && item.last_message && <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={18} color={isRead ? colors.primary : colors.secondaryText} style={{ marginRight: 5 }} />}
                                <Text style={[styles.lastMessage, { fontWeight: item.unread_count > 0 ? 'bold' : 'normal', color: item.unread_count > 0 ? colors.text : colors.secondaryText }]} numberOfLines={1}>
                                    {item.last_message || '...'}
                                </Text>
                            </View>
                            {item.unread_count > 0 && (<View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>)}
                        </View>
                    </View>
                </TouchableOpacity>
            </Swipeable>
        </Animated.View>
    );
});


export default function ChatListScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { session } = useAuth();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    const [favoriteChats, setFavoriteChats] = useState([]);
    const [regularChats, setRegularChats] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [contextMenu, setContextMenu] = useState({ visible: false, user: null });

    const fetchChats = useCallback(async (isRefresh = false) => {
        if (!session) { setIsInitialLoading(false); setIsRefreshing(false); return; }
        if (isRefresh) setIsRefreshing(true);

        try {
            const { data, error } = await supabase.rpc('get_my_chats');
            if (error) throw error;
            const chatsData = data || [];
            setFavoriteChats(chatsData.filter(chat => chat.is_favorite));
            setRegularChats(chatsData.filter(chat => !chat.is_favorite));
        } catch (error) { console.error("Error fetching chats:", error.message);
        } finally { setIsInitialLoading(false); setIsRefreshing(false); }
    }, [session]);

    useFocusEffect(useCallback(() => { fetchChats(); }, [fetchChats]));
    
    useEffect(() => {
        if (!session) return;
        const handleUpdate = () => { fetchChats(); };
        const messagesSubscription = supabase.channel('public:messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleUpdate).subscribe();
        const roomsSubscription = supabase.channel('public:chat_rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, handleUpdate).subscribe();
        const presenceChannel = supabase.channel('online-users');
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = presenceChannel.presenceState();
                const userIds = new Set();
                for (const id in presenceState) {
                    if (presenceState[id]?.[0]?.user_id) userIds.add(presenceState[id][0].user_id);
                }
                setOnlineUsers(userIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') await presenceChannel.track({ user_id: session.user.id });
            });
        return () => { supabase.removeChannel(messagesSubscription); supabase.removeChannel(roomsSubscription); supabase.removeChannel(presenceChannel); };
    }, [session, fetchChats]);

    const handleToggleFavorite = useCallback(async (chatItem) => {
        const isCurrentlyFavorite = favoriteChats.some(c => c.room_id === chatItem.room_id);
        const optimisticItem = { ...chatItem, is_favorite: !isCurrentlyFavorite };
        if (isCurrentlyFavorite) {
            setFavoriteChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
            setRegularChats(prev => [optimisticItem, ...prev].sort((a,b) => moment(b.last_message_time).diff(a.last_message_time)));
        } else {
            setRegularChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
            setFavoriteChats(prev => [optimisticItem, ...prev]);
        }
        const { error } = await supabase.rpc('toggle_favorite', { p_favorited_user_id: chatItem.other_participant_id });
        if (error) { Alert.alert(t('common.error'), error.message); fetchChats(); }
    }, [favoriteChats, t, fetchChats]);

    const handleDeleteChat = (chatItem) => {
        Alert.alert(
            t('chatList.deleteTitle'), t('chatList.deleteBody', { name: chatItem.other_participant_name }),
            [{ text: t('common.cancel'), style: 'cancel' },
             { text: t('common.delete'), style: 'destructive', onPress: async () => {
                 setFavoriteChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
                 setRegularChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
                 const { error } = await supabase.rpc('delete_chat_room', { p_room_id: chatItem.room_id });
                 if (error) { Alert.alert(t('common.error'), error.message); fetchChats(); }
            }}]
        );
    };
    
    const handleContextMenuAction = (action) => {
        const user = contextMenu.user;
        if (!user) return;
        if (action === 'open') { navigation.navigate('IndividualChat', { roomId: user.room_id, recipientId: user.other_participant_id, recipientName: user.other_participant_name, recipientAvatar: user.other_participant_avatar, recipientLastSeen: user.other_participant_last_seen }); }
        if (action === 'favorite') { handleToggleFavorite(user); }
        if (action === 'delete') { handleDeleteChat(user); }
    };

    if (isInitialLoading) {
        return ( <SafeAreaView style={styles.container}><View style={styles.header}><Text style={styles.title}>{t('chatList.title')}</Text><Logo width={40} height={40} /></View><FlatList data={Array.from({ length: 8 })} renderItem={() => <SkeletonChatItem />} keyExtractor={(item, index) => `skeleton-${index}`} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} /></SafeAreaView> );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ContextMenuModal visible={contextMenu.visible} onClose={() => setContextMenu({visible: false, user: null})} user={contextMenu.user} onAction={handleContextMenuAction} />
            <View style={styles.header}><Logo width={40} height={40} /><Text style={styles.title}>{t('chatList.title')}</Text></View>
            <FlatList
                ListHeaderComponent={
                    <>
                        <FavoriteBar chats={favoriteChats} onlineUsers={onlineUsers} onLongPress={(user) => setContextMenu({visible: true, user: user})} />
                        {(favoriteChats.length > 0 && regularChats.length > 0) && <Text style={styles.sectionTitle}>{t('chatList.recent')}</Text>}
                    </>
                }
                data={regularChats}
                renderItem={({ item, index }) => (
                    <ChatItem item={item} index={index} currentUserId={session?.user?.id} onDelete={handleDeleteChat} onToggleFavorite={handleToggleFavorite} onlineUsers={onlineUsers} />
                )}
                keyExtractor={item => item.room_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchChats(true)} tintColor={colors.primary} />}
                ListEmptyComponent={
                    !isInitialLoading && favoriteChats.length === 0 ? (<View style={styles.emptyContainer}><Ionicons name="chatbubbles-outline" size={80} color={colors.secondaryText} /><Text style={styles.emptyText}>{t('chatList.noChats')}</Text></View>) : null
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', justifyContent: 'center', flex: 1, position: 'absolute', left: 0, right: 0, },
    // Стилі для Обраних
    favoritesContainer: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10 },
    favoriteItem: { alignItems: 'center', width: 80 },
    favoriteAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: colors.primary },
    favoriteName: { color: colors.text, fontSize: 13, marginTop: 6, fontWeight: '500' },
    onlineIndicator: { position: 'absolute', bottom: 1, right: 1, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4CAF50', borderWidth: 2.5, borderColor: colors.card, zIndex: 1 },
    // ✅ Нові стилі для індикатора непрочитаних
    favoriteBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.background,
        zIndex: 2,
    },
    favoriteBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Стилі для списку
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginVertical: 10, marginLeft: 4 },
    chatItemCard: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5 },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 58, height: 58, borderRadius: 29 },
    onlineIndicatorSmall: { position: 'absolute', bottom: 2, right: 2, width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: colors.card, zIndex: 1, },
    chatContent: { flex: 1, marginLeft: 4 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    userName: { fontSize: 17, fontWeight: 'bold', color: colors.text, flexShrink: 1 },
    time: { fontSize: 13, color: colors.secondaryText, marginLeft: 8 },
    chatFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMessageContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    lastMessage: { fontSize: 14 },
    badge: { backgroundColor: colors.primary, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, },
    badgeText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '20%' },
    emptyText: { color: colors.secondaryText, fontSize: 17, marginTop: 20, textAlign: 'center', paddingHorizontal: 20 },
    deleteButton: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderTopRightRadius: 20, borderBottomRightRadius: 20 },
    favoriteButton: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%', borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
    // Стилі для контекстного меню
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'},
    contextMenu: { width: '85%', backgroundColor: colors.card, borderRadius: 20, padding: 10 },
    contextMenuHeader: { alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    contextAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    contextUserName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    contextMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
    contextMenuItemText: { fontSize: 17, color: colors.text, marginLeft: 16 },
});