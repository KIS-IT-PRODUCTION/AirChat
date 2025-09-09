import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
    StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
    Pressable, Linking, RefreshControl, Clipboard
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useAuth } from '../provider/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { MotiView, AnimatePresence } from 'moti';
import TypingIndicator from '../app/components/TypingIndicator.js';
import { useUnreadCount } from '../provider/Unread Count Context.js';
import Hyperlink from 'react-native-hyperlink';

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

const SelectionHeader = ({ selectionCount, onCancel, onDelete, colors }) => {
    const styles = getStyles(colors);
    const { t } = useTranslation();
    return (
        <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={onCancel}>
                <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.selectionCountText}>{selectionCount}</Text>
            <TouchableOpacity onPress={onDelete}>
                <Ionicons name="trash-outline" size={26} color={colors.text} />
            </TouchableOpacity>
        </View>
    );
};

const DateSeparator = memo(({ date }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation();
    const formattedDate = useMemo(() => moment(date).calendar(null, { sameDay: `[${t('dates.today', 'Сьогодні')}]`, lastDay: `[${t('dates.yesterday', 'Вчора')}]`, lastWeek: 'dddd', sameElse: 'D MMMM YYYY' }), [date, t]);
    return (<View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>{formattedDate}</Text></View>);
});

const ImageViewerModal = ({ visible, uri, onClose }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); if (!uri) return null;
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><Pressable style={styles.imageViewerBackdrop} onPress={onClose}><Image source={{ uri }} style={styles.fullScreenImage} contentFit="contain" /><TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close-circle" size={32} color="white" /></TouchableOpacity></Pressable></Modal>);
};

const MessageActionSheet = ({ visible, onClose, message, isMyMessage, onCopy, onEdit, onDelete, onReact, onSelect }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation(); const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏']; if (!message) return null; const handleAction = (action) => { action(); onClose(); };
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.actionSheetBackdrop} onPress={onClose}>
                <Pressable style={styles.actionSheetContainer}>
                    <View style={styles.reactionPickerContainer}>{reactions.map(emoji => ( <TouchableOpacity key={emoji} onPress={() => handleAction(() => onReact(emoji))} style={styles.reactionEmojiButton}><Text style={styles.reactionEmojiText}>{emoji}</Text></TouchableOpacity> ))}</View>
                    <View style={styles.actionButtonsContainer}>
                        {isMyMessage && (
                             <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onSelect)}>
                                <Ionicons name="checkmark-circle-outline" size={22} color={colors.text} />
                                <Text style={styles.actionButtonText}>{t('chat.select', 'Вибрати')}</Text>
                            </TouchableOpacity>
                        )}
                        {message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onCopy)}><Ionicons name="copy-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.copy', 'Копіювати')}</Text></TouchableOpacity> )}
                        {isMyMessage && message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onEdit)}><Ionicons name="create-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.edit', 'Редагувати')}</Text></TouchableOpacity> )}
                        {isMyMessage && ( <TouchableOpacity style={[styles.actionButton, { borderBottomWidth: 0 }]} onPress={() => handleAction(onDelete)}><Ionicons name="trash-outline" size={22} color={'#D83C3C'} /><Text style={[styles.actionButtonText, { color: '#D83C3C' }]}>{t('common.delete', 'Видалити')}</Text></TouchableOpacity> )}
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Скасувати')}</Text></TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const MessageBubble = memo(({ message, currentUserId, onImagePress, onLongPress, onDoubleTap, onSelect, selectionMode, isSelected }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation(); const isMyMessage = message.sender_id === currentUserId; const lastTap = useRef(0);
    
    const handlePress = () => {
        if (selectionMode) {
            if (isMyMessage) { onSelect(message.id); }
            return;
        }
        const now = Date.now(); const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) { if (!isMyMessage) { onDoubleTap(message); } }
        lastTap.current = now;
    };
    const openMap = () => { const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' }); const latLng = `${message.location.latitude},${message.location.longitude}`; const label = t('chat.locationLabel'); const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` }); Linking.openURL(url); };
    const UploadingIndicator = () => (<View style={styles.uploadingOverlay}><ActivityIndicator size="large" color="#FFFFFF" /></View>);

    return (
        <AnimatePresence>
            <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'timing', duration: 250 }}>
                <Pressable onLongPress={() => onLongPress(message)} onPress={handlePress} style={styles.messageContainer}>
                    <AnimatePresence>
                        {isSelected && (
                             <MotiView
                                from={{ scale: 1.1, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.1, opacity: 0 }}
                                transition={{ type: 'timing', duration: 150 }}
                                style={styles.selectionOverlay}
                            />
                        )}
                    </AnimatePresence>
                    <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                        <View style={{ maxWidth: '80%' }}>
                            <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}>
                                {message.content && (<Hyperlink linkDefault={true} linkStyle={{ color: isMyMessage ? '#9ECAE8' : '#2980b9' }}><Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text></Hyperlink>)}
                                {message.image_url && (<TouchableOpacity onPress={() => onImagePress(message.image_url)}><Image source={{ uri: message.image_url }} style={[styles.messageImage, message.status === 'uploading' && styles.uploadingImage]} contentFit="cover" transition={300} cachePolicy="disk" />{message.status === 'uploading' && <UploadingIndicator />}</TouchableOpacity>)}
                                {message.location && <TouchableOpacity onPress={openMap}><MapView style={styles.messageMap} initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={message.location} /></MapView></TouchableOpacity>}
                                <View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}><Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>{isMyMessage && <Ionicons name={message.status === 'sending' || message.status === 'uploading' ? "time-outline" : (message.status === 'read' ? "checkmark-done" : "checkmark")} size={16} color={message.status === 'read' ? "#4FC3F7" : "#FFFFFF90"} />}</View>
                            </View>
                            {message.reactions && message.reactions.length > 0 && (<View style={[styles.reactionsContainer, { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}>{message.reactions.map(r => ( <View key={r.emoji} style={styles.reactionBadge}><Text style={styles.reactionBadgeText}>{r.emoji} {r.count}</Text></View> ))}</View>)}
                        </View>
                    </View>
                </Pressable>
            </MotiView>
        </AnimatePresence>
    );
});

// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function IndividualChatScreen() {
    const { colors } = useTheme(); const { t, i18n } = useTranslation(); const styles = getStyles(colors);
    const route = useRoute(); const navigation = useNavigation();
    const { session, profile } = useAuth();
    const { fetchUnreadCount } = useUnreadCount();
    
    useEffect(() => { moment.locale(i18n.language); }, [i18n.language]);

    const { roomId: initialRoomId, recipientId, recipientName, recipientAvatar, recipientLastSeen: initialLastSeen } = route.params;
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
    const [userStatus, setUserStatus] = useState('');
    const [realtimeLastSeen, setRealtimeLastSeen] = useState(initialLastSeen);
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isRecipientOnline, setIsRecipientOnline] = useState(false);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isSendingLocation, setIsSendingLocation] = useState(false);

    const channel = useRef(null);
    const typingTimeout = useRef(null);

    const markAsRead = useCallback(async (roomId) => { if (!roomId) return; try { await supabase.rpc('mark_messages_as_read', { p_room_id: roomId }); } catch (e) { console.error("Error marking as read:", e.message); } }, []);
    const fetchMessages = useCallback(async (roomId) => { if (!roomId) return; const { data, error } = await supabase.from('messages').select('*, reactions(*)').eq('room_id', roomId).order('created_at', { ascending: false }); if (error) { console.error("Fetch Error:", error); } else { setMessages(data || []); } }, []);
    useEffect(() => { const setup = async () => { if (!session || !recipientId) return; let roomId = currentRoomId; if (!roomId) { try { const { data } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: recipientId }); roomId = data; setCurrentRoomId(roomId); } catch (e) { console.error("Error getting room ID:", e); return; } } if (roomId) await fetchMessages(roomId); }; setup(); }, [session, recipientId, currentRoomId, fetchMessages]);
    useEffect(() => { if (!currentRoomId || !session) return; channel.current = supabase.channel(`room-${currentRoomId}`, { config: { presence: { key: session.user.id } } }); const handleNew = (payload) => { setMessages(prev => { const optimisticId = payload.new.client_id; const isAlreadyPresent = prev.some(m => m.id === payload.new.id || (optimisticId && m.id === optimisticId)); if (isAlreadyPresent) { return prev.map(m => (m.id === optimisticId ? payload.new : m)); } return [payload.new, ...prev]; }); if (payload.new.sender_id !== session.user.id) { markAsRead(currentRoomId); } }; const handleUpdate = p => setMessages(prev => prev.map(m => m.id === p.new.id ? p.new : m)); const handleDelete = p => setMessages(prev => prev.filter(m => m.id !== p.old.id)); channel.current.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, handleNew).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, handleUpdate).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, handleDelete).on('presence', { event: 'sync' }, () => setIsRecipientOnline(Object.keys(channel.current.presenceState()).some(k => k === recipientId))).on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.user_id === recipientId) { setIsRecipientTyping(true); if (typingTimeout.current) clearTimeout(typingTimeout.current); typingTimeout.current = setTimeout(() => setIsRecipientTyping(false), 2000); } }).subscribe(); const profileSub = supabase.channel(`profiles:${recipientId}`).on('postgres_changes', { event: 'UPDATE', table: 'profiles', filter: `id=eq.${recipientId}` }, p => setRealtimeLastSeen(p.new.last_seen)).subscribe(); return () => { supabase.removeChannel(channel.current); supabase.removeChannel(profileSub); }; }, [currentRoomId, session, recipientId, markAsRead]);
    useFocusEffect(useCallback(() => { if (currentRoomId) { markAsRead(currentRoomId); fetchUnreadCount(); } }, [currentRoomId, markAsRead, fetchUnreadCount]));
    const processedData = useMemo(() => { const rev = [...messages].reverse(); const items = []; rev.forEach((msg, i) => { const prev = rev[i-1]; if (!prev || !moment(msg.created_at).isSame(moment(prev.created_at), 'day')) { items.push({ id: `date-${msg.created_at}`, type: 'date_separator', date: msg.created_at }); } items.push({ ...msg, type: 'message' }); }); return items.reverse(); }, [messages]);
    const formatUserStatus = useCallback((isOnline, lastSeen) => { if (isOnline) return t('chat.onlineStatus'); if (!lastSeen) return t('chat.offlineStatus'); const lsMoment = moment(lastSeen); if (!lsMoment.isValid()) return t('chat.offlineStatus'); if (moment().diff(lsMoment, 'seconds') < 60) return t('chat.onlineStatus'); if (moment().isSame(lsMoment, 'day')) return t('chat.lastSeen.todayAt', { time: lsMoment.format('HH:mm') }); if (moment().clone().subtract(1, 'day').isSame(lsMoment, 'day')) return t('chat.lastSeen.yesterdayAt', { time: lsMoment.format('HH:mm') }); return t('chat.lastSeen.onDate', { date: lsMoment.format('D MMMM YYYY') }); }, [t]);
    useEffect(() => { setUserStatus(formatUserStatus(isRecipientOnline, realtimeLastSeen)); }, [isRecipientOnline, realtimeLastSeen, formatUserStatus]);
    const onRefresh = useCallback(async () => { setIsRefreshing(true); await fetchMessages(currentRoomId); setIsRefreshing(false); }, [currentRoomId, fetchMessages]);
    
    // ✨ 1. Відновлено оригінальну, робочу функцію відправки
    const handleSendText = async () => {
        if (editingMessage) { handleEditMessage(); return; } 
        const textToSend = inputText.trim(); 
        if (textToSend.length === 0 || !session || !currentRoomId) return; 
        
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = { id: tempId, room_id: currentRoomId, sender_id: session.user.id, content: textToSend, created_at: new Date().toISOString(), status: 'sending', reactions: [] }; 
        
        setMessages(prev => [optimisticMessage, ...prev]); 
        setInputText(''); 
        
        // Використовуємо .select(), щоб отримати підтвердження від сервера
        const { error } = await supabase.from('messages').insert([{ room_id: currentRoomId, sender_id: session.user.id, content: textToSend, client_id: tempId }]).select().single(); 
        
        if (error) { 
            console.error("[SEND] Error:", error); 
            Alert.alert(t('common.error'), error.message); 
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id)); 
        } else { 
            supabase.functions.invoke('send-push-notification', { 
                body: { 
                    recipient_id: recipientId, 
                    sender_id: session.user.id, 
                    message_content: textToSend,
                    room_id: currentRoomId,
                    sender_name: profile?.full_name,
                    sender_avatar: profile?.avatar_url,
                    sender_last_seen: new Date().toISOString()
                }
            }).catch(e => console.error("Push notification error:", e));
        } 
    };

    const handleEditMessage = async () => { if (!editingMessage || !inputText.trim()) return; const newContent = inputText.trim(); setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: newContent } : msg)); setEditingMessage(null); setInputText(''); await supabase.from('messages').update({ content: newContent }).eq('id', editingMessage.id); };
    const handleReaction = async (emoji, message) => { const target = message || selectedMessage; if (!target) return; setMessages(prev => prev.map(msg => { if (msg.id !== target.id) return msg; let reactions = [...(msg.reactions || [])]; const rIdx = reactions.findIndex(r => r.emoji === emoji); if (rIdx > -1) { const uIdx = reactions[rIdx].users.indexOf(session.user.id); if (uIdx > -1) { reactions[rIdx].count--; if (reactions[rIdx].count === 0) reactions.splice(rIdx, 1); } else { reactions[rIdx].count++; reactions[rIdx].users.push(session.user.id); } } else { reactions.push({ emoji, count: 1, users: [session.user.id] }); } return { ...msg, reactions }; })); await supabase.rpc('toggle_reaction', { p_message_id: target.id, p_emoji: emoji }); };
    
    const handleDeleteMessage = () => {
        if (!selectedMessage) return;
        Alert.alert(t('chat.deleteConfirmTitle'), t('chat.deleteConfirmBody'), [ { text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { const messageId = selectedMessage.id; setMessages(prev => prev.filter(msg => msg.id !== messageId)); await supabase.from('messages').delete().eq('id', messageId); } } ]);
    };

    const handleLongPress = (message) => {
        if (selectionMode) {
            if (message.sender_id === session?.user?.id) { handleToggleSelection(message.id); }
        } else {
            setSelectedMessage(message);
            setActionSheetVisible(true);
        }
    };

    const handleToggleSelection = (messageId) => {
        const newSelection = new Set(selectedMessages);
        if (newSelection.has(messageId)) { newSelection.delete(messageId); } else { newSelection.add(messageId); }
        if (newSelection.size === 0) { setSelectionMode(false); }
        setSelectedMessages(newSelection);
    };

    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedMessages(new Set());
    };

    const handleDeleteSelected = () => {
        Alert.alert( t('chat.deleteMultipleConfirmTitle'), t('chat.deleteMultipleConfirmBody', { count: selectedMessages.size }), [ { text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { const idsToDelete = Array.from(selectedMessages); setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg.id))); handleCancelSelection(); await supabase.from('messages').delete().in('id', idsToDelete); } } ]);
    };
    
    // ✨ 2. Відновлено оригінальну, робочу функцію відправки зображень
    const uploadAndSendImage = async (asset) => { 
        const tempId = `temp-img-${Date.now()}`; 
        const optimistic = { id: tempId, room_id: currentRoomId, sender_id: session.user.id, image_url: asset.uri, created_at: new Date().toISOString(), status: 'uploading' }; 
        setMessages(prev => [optimistic, ...prev]); 
        try { 
            const fileExt = asset.uri.split('.').pop().toLowerCase(); 
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`; 
            const formData = new FormData(); 
            formData.append('file', { uri: asset.uri, name: filePath, type: `image/${fileExt}` }); 
            const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, formData); 
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath); 
            const { error: dbError } = await supabase.from('messages').insert([{ room_id: currentRoomId, sender_id: session.user.id, image_url: urlData.publicUrl, client_id: tempId }]);
            if (dbError) throw dbError;
            supabase.functions.invoke('send-push-notification', { body: { recipient_id: recipientId, sender_id: session.user.id, message_content: t('chat.sentAnImage'), room_id: currentRoomId, sender_name: profile?.full_name, sender_avatar: profile?.avatar_url, sender_last_seen: new Date().toISOString() }});
        } catch (e) { 
            Alert.alert(t('common.error'), e.message); 
            setMessages(prev => prev.filter(m => m.id !== tempId)); 
        } 
    };
    const pickImage = async () => { setAttachmentModalVisible(false); const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (!result.canceled) uploadAndSendImage(result.assets[0]); };
    const takePhoto = async () => { setAttachmentModalVisible(false); const { status } = await ImagePicker.requestCameraPermissionsAsync(); if (status !== 'granted') return; const result = await ImagePicker.launchCameraAsync({ quality: 0.8 }); if (!result.canceled) uploadAndSendImage(result.assets[0]); };
    const handleSendLocation = async () => { 
        setAttachmentModalVisible(false); 
        let { status } = await Location.requestForegroundPermissionsAsync(); 
        if (status !== 'granted') return; 
        setIsSendingLocation(true); 
        try { 
            let { coords } = await Location.getCurrentPositionAsync(); 
            const { error } = await supabase.from('messages').insert([{ room_id: currentRoomId, sender_id: session.user.id, location: { latitude: coords.latitude, longitude: coords.longitude } }]); 
            if (error) throw error;
             supabase.functions.invoke('send-push-notification', { body: { recipient_id: recipientId, sender_id: session.user.id, message_content: t('chat.sentLocation'), room_id: currentRoomId, sender_name: profile?.full_name, sender_avatar: profile?.avatar_url, sender_last_seen: new Date().toISOString() }});
        } catch (e) { 
            Alert.alert(t('common.error'), t('chat.locationFetchError')); 
        } finally { 
            setIsSendingLocation(false); 
        } 
    };

    // ✨ 3. Відновлено функцію індикатора друку
    const handleTyping = (text) => {
        setInputText(text);
        if (channel.current && channel.current.state === 'joined') {
            try {
                channel.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { user_id: session.user.id },
                });
            } catch (e) {
                console.error("Broadcast failed:", e);
            }
        }
    };

    const lastMessage = useMemo(() => processedData.find(item => item.type === 'message'), [processedData]);
    const canLikeLastMessage = lastMessage && lastMessage.sender_id !== session?.user?.id;

    return (
        <SafeAreaView style={styles.container}>
            {selectionMode ? (
                <SelectionHeader selectionCount={selectedMessages.size} onCancel={handleCancelSelection} onDelete={handleDeleteSelected} colors={colors} />
            ) : (
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
                    <View style={styles.headerUserInfo}><Text style={styles.headerUserName}>{recipientName}</Text>{isRecipientTyping ? <TypingIndicator /> : <Text style={styles.headerUserStatus}>{userStatus}</Text>}</View>
                    <Image source={recipientAvatar ? { uri: recipientAvatar } : require('../assets/default-avatar.png')} style={styles.headerAvatar} cachePolicy="disk" />
                </View>
            )}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
                <FlatList
                    data={processedData}
                    renderItem={({ item }) => {
                        if (item.type === 'date_separator') return <DateSeparator date={item.date} />;
                        return <MessageBubble message={item} currentUserId={session?.user?.id} onImagePress={setViewingImageUri} onLongPress={handleLongPress} onDoubleTap={m => handleReaction('👍', m)} onSelect={handleToggleSelection} selectionMode={selectionMode} isSelected={selectedMessages.has(item.id)} />;
                    }}
                    keyExtractor={item => item.id.toString()}
                    inverted
                    contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10, flexGrow: 1 }}
                    style={{ flex: 1 }}
                    refreshControl={ <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} /> }
                />
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}><Ionicons name="add" size={30} color={colors.secondaryText} /></TouchableOpacity>
                    {canLikeLastMessage && !inputText && (
                        <TouchableOpacity style={styles.likeButton} onPress={() => handleReaction('👍', lastMessage)}>
                            <Ionicons name="thumbs-up-outline" size={24} color={colors.secondaryText} />
                        </TouchableOpacity>
                    )}
                    {/* ✨ 4. Відновлено зв'язок з handleTyping */}
                    <TextInput style={styles.textInput} value={inputText} onChangeText={handleTyping} placeholder={t('chat.placeholder')} placeholderTextColor={colors.secondaryText} multiline blurOnSubmit={false} />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendText}><Ionicons name={editingMessage ? "checkmark" : "paper-plane"} size={24} color="#fff" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <MessageActionSheet 
                visible={isActionSheetVisible && !selectionMode} 
                onClose={() => setActionSheetVisible(false)} 
                message={selectedMessage} 
                isMyMessage={selectedMessage?.sender_id === session?.user?.id} 
                onCopy={() => Clipboard.setString(selectedMessage?.content || '')} 
                onEdit={() => { 
                    setEditingMessage(selectedMessage); 
                    setInputText(selectedMessage?.content || ''); 
                }} 
                onDelete={handleDeleteMessage} 
                onReact={(emoji) => handleReaction(emoji, selectedMessage)}
                onSelect={() => {
                    setSelectionMode(true);
                    setSelectedMessages(new Set([selectedMessage.id]));
                }}
            />
            <ImageViewerModal visible={!!viewingImageUri} uri={viewingImageUri} onClose={() => setViewingImageUri(null)} />
            <Modal animationType="slide" transparent={true} visible={isAttachmentModalVisible} onRequestClose={() => setAttachmentModalVisible(false)}><Pressable style={styles.modalBackdropAttachments} onPress={() => setAttachmentModalVisible(false)}><View style={styles.modalContent}><TouchableOpacity style={styles.modalButton} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.takePhoto')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalButton} onPress={pickImage}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.pickFromGallery')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalButton} onPress={handleSendLocation}><Ionicons name="location-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.shareLocation')}</Text></TouchableOpacity></View></Pressable></Modal>
             {isSendingLocation && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>{t('chat.fetchingLocation')}</Text></View>)}
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? 25 : 5, backgroundColor: colors.card },
    selectionCountText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    selectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: `${colors.primary}40`, borderRadius: 20, borderWidth: 2, borderColor: `${colors.primary}90` },
    likeButton: { paddingHorizontal: 8 },
    dateSeparator: { alignSelf: 'center', backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginVertical: 10 },
    dateSeparatorText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center',  paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    headerUserInfo: { flex: 1, alignItems: 'center', paddingHorizontal: 10},
    headerUserName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    messageContainer: { marginVertical: 4 },
    messageRow: { flexDirection: 'row' },
    messageBubble: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#FFFFFF' },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    uploadingImage: { opacity: 0.6 },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 15 },
    messageMap: { width: 220, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center', gap: 4 },
    messageInfoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    messageTime: { color: colors.secondaryText, fontSize: 11 },
    myMessageTime: { color: '#FFFFFF90' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8, marginHorizontal: 10, color: colors.text, maxHeight: 120, fontSize: 16 },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    editingBanner: { position: 'absolute', top: -40, left: 0, right: 0, backgroundColor: colors.card, paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    editingText: { color: colors.primary, fontWeight: 'bold', marginLeft: 8, flex: 1 },
    imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeButton: { position: 'absolute', top: 50, right: 20, padding: 10 },
    reactionsContainer: { flexDirection: 'row', marginTop: -8, marginLeft: 10, marginRight: 10, zIndex: 10, position: 'relative' },
    reactionBadge: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    reactionBadgeText: { fontSize: 12, color: colors.text },
    modalBackdropAttachments: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.text, fontSize: 18, marginLeft: 15 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
    actionSheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', },
    actionSheetContainer: { margin: 10, marginBottom: Platform.OS === 'ios' ? 25 : 10, },
    reactionPickerContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 20, padding: 8, justifyContent: 'space-around', alignItems: 'center', marginBottom: 8, elevation: 4, shadowOpacity: 0.1, shadowRadius: 5, },
    reactionEmojiButton: { padding: 4, },
    reactionEmojiText: { fontSize: 28, },
    actionButtonsContainer: { backgroundColor: colors.card, borderRadius: 20, },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, },
    actionButtonText: { color: colors.text, fontSize: 18, marginLeft: 15, },
    cancelButton: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 8, alignItems: 'center', },
    cancelButtonText: { color: colors.primary, fontSize: 18, fontWeight: '600', },
});

