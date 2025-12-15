import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, 
    Platform, Alert, Animated, RefreshControl, Modal, TextInput, ScrollView, Keyboard
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useUnreadCount } from '../provider/Unread Count Context';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useUserStatus } from '../UserStatusContext'; 

// --- ContextMenuModal та BlockReasonModal залишаються без змін ---
// (Вставте їх сюди з попереднього коду, якщо потрібно, вони не змінювалися)
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
                        <Text style={styles.contextMenuItemText}>{t('chatList.contextMenu.openChat', 'Відкрити чат')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextMenuItem} onPress={() => { onClose(); onAction('favorite'); }}>
                        <Ionicons name={user.is_favorite ? "star" : "star-outline"} size={22} color={colors.text} />
                        <Text style={styles.contextMenuItemText}>{user.is_favorite ? t('chatList.contextMenu.removeFromFavorites', 'Видалити з обраних') : t('chatList.contextMenu.addToFavorites', 'Додати в обрані')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.contextMenuItem} onPress={() => { onClose(); onAction('block'); }}>
                        <Ionicons name="ban-outline" size={22} color="#FF3B30" />
                        <Text style={[styles.contextMenuItemText, { color: '#FF3B30' }]}>{t('chatList.contextMenu.blockUser', 'Заблокувати')}</Text>
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

const BlockReasonModal = ({ visible, onClose, onSubmit }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const [reason, setReason] = useState('');
    const handleSubmit = () => {
        if (!reason.trim()) { Alert.alert(t('common.error'), t('chatList.blockReasonRequired', 'Вкажіть причину.')); return; }
        onSubmit(reason); setReason(''); 
    };
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
                <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={styles.reasonMenu}>
                    <Text style={styles.reasonTitle}>{t('chatList.blockReasonTitle', 'Причина блокування')}</Text>
                    <TextInput style={styles.reasonInput} placeholder={t('chatList.reasonPlaceholder', 'Напишіть причину...')} placeholderTextColor={colors.secondaryText} value={reason} onChangeText={setReason} multiline />
                    <TouchableOpacity style={styles.reasonSubmitButton} onPress={handleSubmit}><Text style={styles.reasonSubmitText}>{t('common.blockAndReport', 'Заблокувати')}</Text></TouchableOpacity>
                </MotiView>
            </TouchableOpacity>
        </Modal>
    );
};
// --- Кінець модалок ---

// ✨ Компонент Пошуку
const SearchBar = ({ value, onChange, onClear }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();

    return (
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder={t('common.search', 'Пошук...')}
                placeholderTextColor={colors.secondaryText}
                value={value}
                onChangeText={onChange}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => { onClear(); Keyboard.dismiss(); }}>
                    <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const FavoriteBar = React.memo(({ chats, onlineUsers, onLongPress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    if (!chats || chats.length === 0) return null;

    const renderFavorite = ({ item }) => {
        const isOnline = onlineUsers.has(item.other_participant_id);
        return (
            <TouchableOpacity
                style={styles.favoriteItem}
                onPress={() => navigation.navigate('IndividualChat', {
                    roomId: item.room_id, recipientId: item.other_participant_id, recipientName: item.other_participant_name,
                    recipientAvatar: item.other_participant_avatar, recipientLastSeen: item.other_participant_last_seen,
                })}
                onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onLongPress(item); }}
            >
                <View>
                    <Image source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.favoriteAvatar} />
                    {isOnline && <View style={styles.onlineIndicator} />}
                    {item.unread_count > 0 && (<View style={styles.favoriteBadge}><Text style={styles.favoriteBadgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>)}
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
                extraData={onlineUsers}
            />
        </View>
    );
});

const ChatItem = React.memo(({ item, index, currentUserId, onlineUsers, onLongPress, onOpen, onDelete, onToggleFavorite }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    
    const isMyLastMessage = item.last_message_sender_id === currentUserId;
    const isRead = item.last_message_status === 'read';
    const isOnline = onlineUsers.has(item.other_participant_id);

    const anim = useRef(new Animated.Value(0)).current;
    const swipeableRowRef = useRef(null); 
    
    useEffect(() => { Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }).start(); }, []);

    // ✨ Оновлені Swipe Actions (зліва - Обране)
    const renderLeftActions = (progress, dragX) => {
         const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0.8, 1], extrapolate: 'clamp' });
         const actionIcon = item.is_favorite ? "star-outline" : "star"; // Використовуємо filled star для дії
         
         return (
             <TouchableOpacity style={styles.leftActionContainer} onPress={() => { onToggleFavorite(); swipeableRowRef.current?.close(); }}>
                 <Animated.View style={[styles.actionIconWrapper, { backgroundColor: '#FFC107', transform: [{ scale }] }]}>
                     <Ionicons name={actionIcon} size={24} color="#FFF" />
                     {/* Можна додати текст, якщо потрібно, але іконка чистіша */}
                 </Animated.View>
             </TouchableOpacity>
         );
    };

    // ✨ Оновлені Swipe Actions (справа - Видалення)
    const renderRightActions = (progress, dragX) => {
        const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0.8], extrapolate: 'clamp' });
        
        return (
            <TouchableOpacity style={styles.rightActionContainer} onPress={() => { onDelete(); swipeableRowRef.current?.close(); }}>
                <Animated.View style={[styles.actionIconWrapper, { backgroundColor: '#FF3B30', transform: [{ scale }] }]}>
                    <Ionicons name="trash" size={24} color="#FFF" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <Animated.View style={{ opacity: anim }}>
            <Swipeable
                ref={swipeableRowRef}
                friction={2}
                leftThreshold={60}
                rightThreshold={60}
                renderLeftActions={renderLeftActions}
                renderRightActions={renderRightActions}
                onSwipeableWillOpen={() => onOpen(item.room_id, swipeableRowRef.current)}
                containerStyle={{ overflow: 'visible' }} // Важливо для тіней
            >
                <TouchableOpacity
                    style={styles.chatItemCard} activeOpacity={0.9} // Трохи збільшили opacity
                    onPress={() => navigation.navigate('IndividualChat', {
                        roomId: item.room_id, recipientId: item.other_participant_id, recipientName: item.other_participant_name,
                        recipientAvatar: item.other_participant_avatar, recipientLastSeen: item.other_participant_last_seen,
                    })}
                    onLongPress={() => onLongPress(item)}
                >
                    <View style={styles.avatarContainer}>
                        <Image source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.avatar} contentFit="cover" transition={300} cachePolicy="disk" />
                        {isOnline && <View style={styles.onlineIndicatorSmall} />}
                    </View>
                    <View style={styles.chatContent}>
                        <View style={styles.chatHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1}}>
                                {item.is_favorite && <Ionicons name="star" size={14} color="#FFC700" style={{marginRight: 4}} />}
                                <Text style={styles.userName} numberOfLines={1}>{item.other_participant_name || 'User'}</Text>
                            </View>
                            <Text style={styles.time}>{item.last_message_time ? moment(item.last_message_time).fromNow(true) : ''}</Text>
                        </View>
                        <View style={styles.chatFooter}>
                            <View style={styles.lastMessageContainer}>
                                {isMyLastMessage && item.last_message && <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={18} color={isRead ? colors.primary : colors.secondaryText} style={{ marginRight: 5 }} />}
                                <Text style={[styles.lastMessage, { fontWeight: item.unread_count > 0 ? '600' : 'normal', color: item.unread_count > 0 ? colors.text : colors.secondaryText }]} numberOfLines={1}>
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
}, (prevProps, nextProps) => {
    const isOnlineChanged = prevProps.onlineUsers.has(prevProps.item.other_participant_id) !== nextProps.onlineUsers.has(nextProps.item.other_participant_id);
    const isItemChanged = prevProps.item === nextProps.item;
    return !isOnlineChanged && isItemChanged;
});

const SkeletonChatItem = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const opacityAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([Animated.timing(opacityAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }), Animated.timing(opacityAnim, { toValue: 1, duration: 700, useNativeDriver: true })])).start();
    }, []);
    return (
        <Animated.View style={[styles.chatItemCard, { opacity: opacityAnim, backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]} />
            <View style={styles.chatContent}>
                <View style={[styles.skeletonLine, { width: '50%', height: 16, marginBottom: 10 }]} />
                <View style={[styles.skeletonLine, { width: '80%', height: 14 }]} />
            </View>
        </Animated.View>
    );
};

export default function ChatListScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { session } = useAuth();
    const { fetchUnreadCount } = useUnreadCount();
    const { onlineUsers } = useUserStatus(); 
    
    const styles = getStyles(colors);
    const navigation = useNavigation();
    
    const [favoriteChats, setFavoriteChats] = useState([]);
    const [regularChats, setRegularChats] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // ✨ Додаємо стан для пошуку
    const [searchQuery, setSearchQuery] = useState('');

    const [contextMenu, setContextMenu] = useState({ visible: false, user: null });
    const [isBlockModalVisible, setIsBlockModalVisible] = useState(false);
    const [userToBlock, setUserToBlock] = useState(null); 
    
    const openSwipeableRowRef = useRef(null); 

    const fetchChats = useCallback(async (isRefresh = false) => {
        if (!session || !session.user) { setIsInitialLoading(false); setIsRefreshing(false); return; }
        if (isRefresh) setIsRefreshing(true);
        try {
            const { data, error } = await supabase.rpc('get_my_chats', { p_user_id: session.user.id });
            if (error) throw error;
            const chatsData = data || [];
            setFavoriteChats(chatsData.filter(chat => chat.is_favorite));
            setRegularChats(chatsData.filter(chat => !chat.is_favorite));
        } catch (error) { console.error("Error fetching chats:", error.message); } 
        finally { setIsInitialLoading(false); setIsRefreshing(false); }
    }, [session]);

    useFocusEffect(useCallback(() => { fetchChats(); }, [fetchChats]));
    
    useEffect(() => {
        if (!session) return;
        const messagesSub = supabase.channel('public:messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { fetchChats(); fetchUnreadCount(); }).subscribe();
        const favoritesSub = supabase.channel('public:favorite_contacts').on('postgres_changes', { event: '*', schema: 'public', table: 'favorite_contacts', filter: `user_id=eq.${session.user.id}` }, () => { fetchChats(); }).subscribe();
        return () => { supabase.removeChannel(messagesSub); supabase.removeChannel(favoritesSub); };
    }, [session, fetchChats, fetchUnreadCount]);

    const handleToggleFavorite = useCallback(async (chatItem) => {
         if (!chatItem) return;
         const newFavoriteStatus = !chatItem.is_favorite;
         const originalFavs = [...favoriteChats];
         const originalRegs = [...regularChats];
         
         // Optimistic Update
         if (newFavoriteStatus) {
             setRegularChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
             setFavoriteChats(prev => [{ ...chatItem, is_favorite: true }, ...prev]);
         } else {
             setFavoriteChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
             setRegularChats(prev => [{ ...chatItem, is_favorite: false }, ...prev]);
         }
         
         try {
             const { error } = await supabase.rpc('toggle_favorite_contact', { p_favorited_user_id: chatItem.other_participant_id });
             if (error) throw error;
         } catch (error) {
             Alert.alert(t('common.error'), error.message);
             setFavoriteChats(originalFavs);
             setRegularChats(originalRegs);
         }
    }, [favoriteChats, regularChats, t]);

    const handleDeleteChat = (chatItem) => {
        if (!chatItem) return;
        Alert.alert(t('chatList.deleteTitle', 'Видалити чат?'), t('chatList.deleteBody', { name: chatItem.other_participant_name }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                setFavoriteChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
                setRegularChats(prev => prev.filter(c => c.room_id !== chatItem.room_id));
                try {
                    const { error } = await supabase.rpc('delete_chat_room', { p_room_id: chatItem.room_id });
                    if (error) throw error;
                } catch (error) { Alert.alert(t('common.error'), error.message); fetchChats(); }
            }},
        ]);
    };

    const handleBlockAndReportUser = async (reason) => {
         if (!userToBlock || !session?.user?.id) return;
         setIsBlockModalVisible(false);
         const { error: blockError } = await supabase.from('blocked_users').upsert({ blocker_id: session.user.id, blocked_id: userToBlock.other_participant_id }, { ignoreDuplicates: true });
         const { error: reportError } = await supabase.from('reports').insert({ reporter_id: session.user.id, reported_user_id: userToBlock.other_participant_id, reason: reason.trim() });
         setUserToBlock(null);
         if (blockError || reportError) { Alert.alert(t('common.error'), blockError?.message || reportError?.message); } else { Alert.alert(t('common.success'), t('chatList.blockSuccess', 'Заблоковано.')); fetchChats(); }
    };

    const handleContextMenuAction = (action) => {
        const user = contextMenu.user;
        if (!user) return;
        if (action === 'open') { navigation.navigate('IndividualChat', { roomId: user.room_id, recipientId: user.other_participant_id, recipientName: user.other_participant_name, recipientAvatar: user.other_participant_avatar, recipientLastSeen: user.other_participant_last_seen }); }
        if (action === 'favorite') { handleToggleFavorite(user); }
        if (action === 'delete') { handleDeleteChat(user); }
        if (action === 'block') { setUserToBlock(user); setIsBlockModalVisible(true); }
    };

    const handleSwipeableOpen = (roomId, ref) => {
        if (openSwipeableRowRef.current && openSwipeableRowRef.current !== ref) { openSwipeableRowRef.current.close(); }
        openSwipeableRowRef.current = ref;
    };

    // ✨ Логіка фільтрації для пошуку
    const getFilteredChats = (chats) => {
        if (!searchQuery.trim()) return chats;
        return chats.filter(chat => 
            chat.other_participant_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const displayedFavorites = getFilteredChats(favoriteChats);
    const displayedRegular = getFilteredChats(regularChats);

    if (isInitialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                 <View style={styles.header}><Logo width={40} height={40} /><Text style={styles.title}>{t('chatList.title')}</Text></View>
                 <View style={{paddingHorizontal: 16, paddingBottom: 10}}><View style={[styles.searchContainer, {opacity: 0.5}]} /></View>
                 <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
                    {[...Array(5)].map((_, index) => (<View key={index} style={{ marginBottom: 10 }}><SkeletonChatItem /></View>))}
                 </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ContextMenuModal visible={contextMenu.visible} onClose={() => setContextMenu({visible: false, user: null})} user={contextMenu.user} onAction={handleContextMenuAction} />
            <BlockReasonModal visible={isBlockModalVisible} onSubmit={handleBlockAndReportUser} onClose={() => { setIsBlockModalVisible(false); setUserToBlock(null); }} />

            <View style={styles.header}>
                <Logo width={40} height={40} />
                <Text style={styles.title}>{t('chatList.title')}</Text>
            </View>

            <FlatList
                // ✨ Додаємо пошук в хедер списку
                ListHeaderComponent={
                    <>
                        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                            <SearchBar value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
                        </View>
                        
                        {displayedFavorites.length > 0 && (
                            <FavoriteBar 
                                chats={displayedFavorites} 
                                onlineUsers={onlineUsers} 
                                onLongPress={(user) => setContextMenu({visible: true, user: user})} 
                            />
                        )}
                        {(displayedFavorites.length > 0 && displayedRegular.length > 0) && <Text style={styles.sectionTitle}>{t('chatList.recent', 'Останні')}</Text>}
                    </>
                }
                data={displayedRegular}
                renderItem={({ item, index }) => (
                    <ChatItem 
                        item={item} 
                        index={index} 
                        currentUserId={session?.user?.id} 
                        onlineUsers={onlineUsers} 
                        onLongPress={(user) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setContextMenu({visible: true, user: user}); }}
                        onOpen={handleSwipeableOpen}
                        onDelete={() => handleDeleteChat(item)}
                        onToggleFavorite={() => handleToggleFavorite(item)}
                    />
                )}
                keyExtractor={item => item.room_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchChats(true)} tintColor={colors.primary} />}
                extraData={[onlineUsers, searchQuery]} // Оновлюємо список при зміні пошуку або статусу
                ListEmptyComponent={
                    !isInitialLoading && (
                        <View style={styles.emptyContainer}>
                            {searchQuery ? (
                                <>
                                    <Ionicons name="search-outline" size={60} color={colors.secondaryText} />
                                    <Text style={styles.emptyText}>{t('chatList.noResults', 'Нічого не знайдено')}</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="chatbubbles-outline" size={80} color={colors.secondaryText} />
                                    <Text style={styles.emptyText}>{t('chatList.noChats', 'У вас поки немає чатів')}</Text>
                                </>
                            )}
                        </View>
                    )
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', flex: 1, marginLeft: -40 },
    
    // ✨ Стилі для Пошуку
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: colors.border
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: colors.text, fontSize: 16, height: '100%' },

    favoritesContainer: { paddingVertical: 10, marginBottom: 5 },
    favoriteItem: { alignItems: 'center', width: 80 },
    favoriteAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: colors.primary },
    favoriteName: { color: colors.text, fontSize: 12, marginTop: 6, fontWeight: '500', textAlign: 'center' },
    onlineIndicator: { position: 'absolute', bottom: 1, right: 1, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4CAF50', borderWidth: 2.5, borderColor: colors.card, zIndex: 1 },
    favoriteBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: colors.primary, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background, zIndex: 2 },
    favoriteBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginVertical: 10, marginLeft: 4 },
    
    chatItemCard: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
    avatarContainer: { marginRight: 12 },
    avatar: { width: 58, height: 58, borderRadius: 29 },
    onlineIndicatorSmall: { position: 'absolute', bottom: 2, right: 2, width: 15, height: 15, borderRadius: 7.5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: colors.card, zIndex: 1, },
    chatContent: { flex: 1, marginLeft: 4, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    userName: { fontSize: 16, fontWeight: 'bold', color: colors.text, flexShrink: 1 },
    time: { fontSize: 12, color: colors.secondaryText, marginLeft: 8 },
    chatFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMessageContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    lastMessage: { fontSize: 14 },
    badge: { backgroundColor: colors.primary, borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { color: colors.secondaryText, fontSize: 16, marginTop: 16, textAlign: 'center' },
    
    // ✨ Оновлені стилі для Swipe Actions
    leftActionContainer: { width: 80, justifyContent: 'center', alignItems: 'center' },
    rightActionContainer: { width: 80, justifyContent: 'center', alignItems: 'center' },
    actionIconWrapper: { 
        width: 50, height: 50, 
        borderRadius: 25, 
        justifyContent: 'center', alignItems: 'center',
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4
    },

    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'},
    contextMenu: { width: '85%', backgroundColor: colors.card, borderRadius: 20, padding: 10 },
    contextMenuHeader: { alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    contextAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
    contextUserName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    contextMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
    contextMenuItemText: { fontSize: 17, color: colors.text, marginLeft: 16 },
    reasonMenu: { width: '90%', backgroundColor: colors.card, borderRadius: 20, padding: 20, alignItems: 'center' },
    reasonTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    reasonInput: { width: '100%', height: 100, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 10, color: colors.text, fontSize: 16, textAlignVertical: 'top', marginBottom: 20 },
    reasonSubmitButton: { backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center' },
    reasonSubmitText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
    skeletonLine: { backgroundColor: colors.border, borderRadius: 4 },
});