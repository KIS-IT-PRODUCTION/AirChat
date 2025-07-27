import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, Image } from 'react-native';
import { useTheme } from './ThemeContext';
import { useNavigation } from '@react-navigation/native';
import Logo from '../assets/icon.svg';
import { useTranslation } from 'react-i18next'; // ✨ Імпорт

const mockChats = [
    { id: '1', name: 'Esther', avatar: 'https://i.pravatar.cc/150?u=esther', lastMessage: 'Чекаю вас біля вокзалу...', time: '22:59', unreadCount: 3 },
    { id: '2', name: 'Aubrey', avatar: 'https://i.pravatar.cc/150?u=aubrey', lastMessage: 'Мені потрібна ваша до...', time: '14:36', unreadCount: 1 },
    { id: '3', name: 'Randall', avatar: 'https://i.pravatar.cc/150?u=randall', lastMessage: 'Останнім часом їздив у ...', time: '10:39', unreadCount: 2 },
    { id: '4', name: 'Shane', avatar: 'https://i.pravatar.cc/150?u=shane', lastMessage: 'Добрий день, хочу поїхати...', time: '9:40', unreadCount: 0 },
    // ... інші чати
];

const ChatListItem = ({ item }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    return (
        <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => navigation.navigate('IndividualChat', { 
                userName: item.name, 
                userAvatar: item.avatar 
            })}
        >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                <View style={styles.chatFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function ChatListScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation(); // ✨
    const styles = getStyles(colors);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('chatList.title', 'Повідомлення')}</Text>
                <Logo width={40} height={40} />
            </View>
            <FlatList
                data={mockChats}
                renderItem={({ item }) => <ChatListItem item={item} />}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    chatItem: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    userName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    time: { fontSize: 12, color: colors.secondaryText },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMessage: { fontSize: 14, color: colors.secondaryText, flex: 1 },
    badge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 80 },
});