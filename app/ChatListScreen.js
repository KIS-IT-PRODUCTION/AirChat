// app/ChatListScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from './ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';

const ChatListItem = ({ item, currentUserId }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    const isMyLastMessage = item.last_message_sender_id === currentUserId;
    const isRead = item.last_message_status === 'read';

    return (
        <TouchableOpacity 
            style={styles.chatItem}
            // ✨ ВИПРАВЛЕНО: Повернено всі необхідні параметри для навігації
            onPress={() => navigation.navigate('IndividualChat', { 
                roomId: item.room_id,
                recipientId: item.other_participant_id,
                recipientName: item.other_participant_name, 
                recipientAvatar: item.other_participant_avatar,
                recipientLastSeen: item.other_participant_last_seen,
            })}
        >
            <Image source={item.other_participant_avatar ? { uri: item.other_participant_avatar } : require('../assets/default-avatar.png')} style={styles.avatar} />
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.userName}>{item.other_participant_name}</Text>
                    <Text style={styles.time}>{item.last_message_time ? moment(item.last_message_time).format('HH:mm') : ''}</Text>
                </View>
                <View style={styles.chatFooter}>
                    {isMyLastMessage && item.last_message && (
                        <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={16} color={isRead ? colors.primary : colors.secondaryText} style={{ marginRight: 4 }} />
                    )}
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || '...'}</Text>
                    {item.unread_count > 0 && (
                        <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function ChatListScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { session } = useAuth();
    const styles = getStyles(colors);
    
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = useCallback(async () => {
        if (!session) { setLoading(false); return; }
        try {
            const { data, error } = await supabase.rpc('get_my_chats');
            if (error) throw error;
            setChats(data);
        } catch (error) {
            console.error("Error fetching chats:", error.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchChats();
        }, [fetchChats])
    );

    useEffect(() => {
        if (!session) return;
        const subscription = supabase
            .channel('public:messages:chatlist')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'messages' },
                () => {
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [session, fetchChats]);


    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}><Text style={styles.title}>{t('chatList.title', 'Повідомлення')}</Text><Logo width={40} height={40} /></View>
                <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><Text style={styles.title}>{t('chatList.title', 'Повідомлення')}</Text><Logo width={40} height={40} /></View>
            <FlatList
                data={chats}
                renderItem={({ item }) => <ChatListItem item={item} currentUserId={session?.user?.id} />}
                keyExtractor={item => item.room_id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('chatList.noChats', 'У вас ще немає чатів.')}</Text></View>}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    chatItem: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: colors.border },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    userName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    time: { fontSize: 12, color: colors.secondaryText },
    chatFooter: { flexDirection: 'row', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: colors.secondaryText, flex: 1 },
    badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 6 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { color: colors.secondaryText, fontSize: 16 },
});
