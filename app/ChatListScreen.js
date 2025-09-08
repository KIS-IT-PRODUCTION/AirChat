import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Animated } from 'react-native';
// ✨ 1. Імпортуємо покращений компонент Image з expo-image
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useNavigation } from '@react-navigation/native'; // useFocusEffect більше не потрібен
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

const SkeletonChatItem = () => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.chatItemCard}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]} />
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={{ width: '60%', height: 20, backgroundColor: colors.border, borderRadius: 4 }} />
                <View style={{ width: '80%', height: 16, marginTop: 8, backgroundColor: colors.border, borderRadius: 4 }} />
            </View>
        </View>
    );
};

const ChatListItem = React.memo(({ item, index, currentUserId, onDelete }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    const swipeableRef = useRef(null);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
    }, []);

    const isMyLastMessage = item.last_message_sender_id === currentUserId;
    const isRead = item.last_message_status === 'read';
    const isOnline = item.other_participant_last_seen && moment().diff(moment(item.other_participant_last_seen), 'minutes') < 5;

    const renderRightActions = (progress, dragX) => {
        const trans = dragX.interpolate({ inputRange: [-80, 0], outputRange: [0, 80], extrapolate: 'clamp' });
        return (
            <TouchableOpacity style={styles.deleteButton} onPress={() => { swipeableRef.current?.close(); onDelete(item); }}>
                <Animated.View style={{ transform: [{ translateX: trans }] }}>
                    <Ionicons name="trash-outline" size={26} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <Animated.View style={{ opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }}>
            <Swipeable ref={swipeableRef} renderRightActions={renderRightActions}>
                <TouchableOpacity
                    style={styles.chatItemCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('IndividualChat', {
                        roomId: item.room_id,
                        recipientId: item.other_participant_id,
                        recipientName: item.other_participant_name,
                        recipientAvatar: item.other_participant_avatar,
                        recipientLastSeen: item.other_participant_last_seen,
                    })}
                >
                    <View style={styles.avatarContainer}>
                        {/* ✨ 2. Замінюємо стандартний Image на новий з кешуванням */}
                        <Image
                            source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={300}
                            cachePolicy="disk" // Вмикає кешування на диску
                        />
                        {isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.chatContent}>
                        <View style={styles.chatHeader}>
                            <Text style={styles.userName} numberOfLines={1}>{item.other_participant_name || 'User'}</Text>
                            <Text style={styles.time}>{item.last_message_time ? moment(item.last_message_time).fromNow(true) : ''}</Text>
                        </View>
                        <View style={styles.chatFooter}>
                            <View style={styles.lastMessageContainer}>
                                {isMyLastMessage && item.last_message && (
                                    <Ionicons
                                        name={isRead ? "checkmark-done" : "checkmark"}
                                        size={18}
                                        color={isRead ? colors.primary : colors.secondaryText}
                                        style={{ marginRight: 5 }}
                                    />
                                )}
                                <Text style={[styles.lastMessage, { fontWeight: item.unread_count > 0 ? 'bold' : 'normal', color: item.unread_count > 0 ? colors.text : colors.secondaryText }]} numberOfLines={1}>
                                    {item.last_message || '...'}
                                </Text>
                            </View>
                            {item.unread_count > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text>
                                </View>
                            )}
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

    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        // Не встановлюємо loading(true) тут, щоб уникнути блимання при оновленні
        try {
            const { data, error } = await supabase.rpc('get_my_chats');
            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error("Error fetching chats:", error.message);
        } finally {
            setLoading(false); // Вимикаємо завантаження в будь-якому випадку
        }
    }, [session]);

    // ✨ 3. Замінюємо useFocusEffect на useEffect для одноразового завантаження
    useEffect(() => {
        // Завантажуємо чати тільки якщо є сесія
        if (session) {
            fetchChats();
        } else {
            // Якщо сесії немає (наприклад, користувач вийшов), очищуємо список
            setChats([]);
            setLoading(false);
        }
    }, [session, fetchChats]);
    
    const handleRealtimeUpdate = useCallback((payload) => {
        const newMessage = payload.new;
        
        setChats(currentChats => {
            const chatIndex = currentChats.findIndex(c => c.room_id === newMessage.room_id);
            
            if (chatIndex > -1) {
                const existingChat = { ...currentChats[chatIndex] };
                existingChat.last_message = newMessage.content || (newMessage.image_url ? t('chat.sentAnImage') : t('chat.sentLocation'));
                existingChat.last_message_time = newMessage.created_at;
                existingChat.last_message_sender_id = newMessage.sender_id;
                existingChat.last_message_status = 'sent';
                if (newMessage.sender_id !== session.user.id) {
                    existingChat.unread_count = (existingChat.unread_count || 0) + 1;
                }
                const filteredChats = currentChats.filter(c => c.room_id !== newMessage.room_id);
                return [existingChat, ...filteredChats];
            } else {
                console.log("New chat detected, fetching full list.");
                fetchChats();
                return currentChats;
            }
        });
    }, [session?.user?.id, t, fetchChats]);


    useEffect(() => {
        if (!session) return;
        
        const subscription = supabase
            .channel('public:chat_list_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleRealtimeUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, fetchChats)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [session, handleRealtimeUpdate, fetchChats]);

    const handleDeleteChat = (chatItem) => {
        Alert.alert(
            t('chatList.deleteTitle', 'Видалити чат?'),
            t('chatList.deleteBody', { name: chatItem.other_participant_name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const originalChats = chats;
                        setChats(prev => prev.filter(chat => chat.room_id !== chatItem.room_id));
                        const { error } = await supabase.rpc('delete_chat_room', { p_room_id: chatItem.room_id });
                        if (error) {
                            Alert.alert(t('common.error'), error.message);
                            setChats(originalChats);
                        }
                    }
                }
            ]
        );
    };

    if (loading && chats.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}><Text style={styles.title}>{t('chatList.title', 'Повідомлення')}</Text><Logo width={40} height={40} /></View>
                <FlatList
                    data={Array.from({ length: 7 })}
                    renderItem={({ item, index }) => <SkeletonChatItem key={index} />}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>{t('chatList.title', 'Повідомлення')}</Text><Logo width={40} height={40} /></View>
            <FlatList
                data={chats}
                renderItem={({ item, index }) => <ChatListItem item={item} index={index} currentUserId={session?.user?.id} onDelete={handleDeleteChat} />}
                keyExtractor={item => item.room_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                onRefresh={fetchChats}
                refreshing={loading}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={80} color={colors.secondaryText} />
                            <Text style={styles.emptyText}>{t('chatList.noChats', 'У вас ще немає чатів.')}</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

// --- (Стилі залишаються без змін) ---
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 32, fontWeight: 'bold', color: colors.text },
    chatItemCard: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    avatarContainer: { marginRight: 16 },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    onlineIndicator: {
        position: 'absolute',
        bottom: 3,
        right: 3,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: colors.card,
        zIndex: 1,
    },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    userName: { fontSize: 18, fontWeight: '700', color: colors.text, flexShrink: 1 },
    time: { fontSize: 13, color: colors.secondaryText, marginLeft: 8 },
    chatFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    lastMessageContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    lastMessage: { fontSize: 15 },
    badge: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        elevation: 2,
    },
    badgeText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '30%' },
    emptyText: { color: colors.secondaryText, fontSize: 17, marginTop: 20, textAlign: 'center', paddingHorizontal: 20 },
    deleteButton: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 20,
        marginLeft: 10,
    },
});
