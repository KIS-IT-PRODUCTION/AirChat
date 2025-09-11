import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Animated, RefreshControl } from 'react-native';
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

// Скелетон для початкового завантаження
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

// Компонент елемента списку чатів, обгорнутий в memo для оптимізації
const ChatListItem = React.memo(({ item, index, currentUserId, onDelete }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    const swipeableRef = useRef(null);

    const isMyLastMessage = item.last_message_sender_id === currentUserId;
    const isRead = item.last_message_status === 'read';
    const isOnline = item.other_participant_last_seen && moment().diff(moment(item.other_participant_last_seen), 'minutes') < 5;

    const renderRightActions = () => (
        <TouchableOpacity style={styles.deleteButton} onPress={() => { swipeableRef.current?.close(); onDelete(item); }}>
            <Ionicons name="trash-outline" size={26} color="#fff" />
        </TouchableOpacity>
    );
    
    // Анімація появи елементів залишається для плавного UX
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={{ opacity: anim }}>
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
                        <Image
                            source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={300}
                            cachePolicy="disk"
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
    // ✨ 1. Оптимізація: Розділяємо стани для початкового завантаження і для pull-to-refresh
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ✨ 2. Оптимізація: Єдина функція для завантаження даних
    const fetchChats = useCallback(async (isRefresh = false) => {
        if (!session) {
            setIsInitialLoading(false);
            setIsRefreshing(false);
            return;
        }
        // Показуємо індикатор тільки для pull-to-refresh
        if (isRefresh) {
            setIsRefreshing(true);
        }

        try {
            const { data, error } = await supabase.rpc('get_my_chats');
            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error("Error fetching chats:", error.message);
        } finally {
            // Вимикаємо всі індикатори завантаження
            setIsInitialLoading(false);
            setIsRefreshing(false);
        }
    }, [session]);

    // ✨ 3. Оптимізація: Оновлюємо список при фокусі на екрані (повернення з чату)
    useFocusEffect(
        useCallback(() => {
            fetchChats();
        }, [fetchChats])
    );
    
    // ✨ 4. Оптимізація: Спрощена і надійна логіка реального часу
    useEffect(() => {
        if (!session) return;
        
        // Єдина функція-обробник, яка просто перезавантажує дані
        const handleUpdate = (payload) => {
            console.log('Realtime update received, refetching chats...', payload.eventType);
            fetchChats();
        };

        const subscription = supabase
            .channel('public:chat_list_updates')
            // Слухаємо будь-які зміни в повідомленнях
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleUpdate)
            // Слухаємо будь-які зміни в кімнатах (наприклад, видалення)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, handleUpdate)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [session, fetchChats]);

    const handleDeleteChat = (chatItem) => {
        Alert.alert(
            t('chatList.deleteTitle'),
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

    if (isInitialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}><Text style={styles.title}>{t('chatList.title')}</Text><Logo width={40} height={40} /></View>
                <FlatList
                    data={Array.from({ length: 8 })}
                    renderItem={() => <SkeletonChatItem />}
                    keyExtractor={(item, index) => `skeleton-${index}`}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>{t('chatList.title')}</Text><Logo width={40} height={40} /></View>
            <FlatList
                data={chats}
                renderItem={({ item, index }) => <ChatListItem item={item} index={index} currentUserId={session?.user?.id} onDelete={handleDeleteChat} />}
                keyExtractor={item => item.room_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchChats(true)} tintColor={colors.primary} />}
                ListEmptyComponent={
                    !isInitialLoading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={80} color={colors.secondaryText} />
                            <Text style={styles.emptyText}>{t('chatList.noChats')}</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    chatItemCard: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
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
    },
});