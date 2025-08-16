// app/IndividualChatScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Pressable, Linking, AppState } from 'react-native';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useAuth } from '../provider/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import MapView, { Marker } from 'react-native-maps';

// --- Допоміжні компоненти (без змін) ---
const ImageViewerModal = ({ visible, uri, onClose }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    if (!uri) return null;
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><Pressable style={styles.imageViewerBackdrop} onPress={onClose}><Image source={{ uri }} style={styles.fullScreenImage} resizeMode="contain" /><TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close-circle" size={32} color="white" /></TouchableOpacity></Pressable></Modal> );
};
const MessageBubble = ({ message, currentUserId, onImagePress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const isMyMessage = message.sender_id === currentUserId;
    const isRead = message.status === 'read';
    const openMap = () => { const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' }); const latLng = `${message.location.latitude},${message.location.longitude}`; const label = t('chat.locationLabel', 'Геолокація'); const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` }); Linking.openURL(url); };
    return( <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}><View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}><View>{message.content && <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text>}{message.image_url && <TouchableOpacity onPress={() => onImagePress(message.image_url)}><Image source={{ uri: message.image_url }} style={styles.messageImage} /></TouchableOpacity>}{message.location && <TouchableOpacity onPress={openMap}><MapView style={styles.messageMap} initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={message.location} /></MapView></TouchableOpacity>}</View><View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}><Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>{isMyMessage && <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={16} color={isRead ? "#4FC3F7" : "#FFFFFF90"} />}</View></View></View> );
};

// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    const route = useRoute();
    const navigation = useNavigation();
    const { session } = useAuth();
    
    const { roomId, recipientId, recipientName, recipientAvatar, recipientLastSeen } = route.params;
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [userStatus, setUserStatus] = useState(recipientLastSeen ? moment(recipientLastSeen).fromNow() : t('chat.offlineStatus', 'не в мережі'));
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    
    const typingTimeout = useRef(null);
    const channel = useRef(null);

    const markAsRead = useCallback(async () => { if (!roomId) return; try { await supabase.rpc('mark_messages_as_read', { p_room_id: roomId }); } catch (error) { console.error("Error marking messages as read:", error.message); } }, [roomId]);

    useEffect(() => {
        const initializeChat = async () => { if (!roomId || !session) { setLoading(false); return; } try { const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false }); if (error) throw error; setMessages(data); markAsRead(); } catch (error) { console.error("Error fetching messages:", error); } finally { setLoading(false); } };
        initializeChat();
        channel.current = supabase.channel(`room-${roomId}`, { config: { presence: { key: session.user.id } } });
        channel.current.on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, payload => { if (payload.eventType === 'INSERT' && payload.new.sender_id !== session.user.id) { setMessages(prev => [payload.new, ...prev]); markAsRead(); } else if (payload.eventType === 'UPDATE') { setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg)); } }).on('presence', { event: 'sync' }, () => { const presenceState = channel.current.presenceState(); const recipientIsOnline = Object.keys(presenceState).some(key => key === recipientId); setUserStatus(recipientIsOnline ? t('chat.onlineStatus', 'в мережі') : (recipientLastSeen ? moment(recipientLastSeen).fromNow() : t('chat.offlineStatus', 'не в мережі'))); }).on('presence', { event: 'join' }, ({ key }) => { if (key === recipientId) setUserStatus(t('chat.onlineStatus', 'в мережі')); }).on('presence', { event: 'leave' }, ({ key }) => { if (key === recipientId) setUserStatus(moment().fromNow()); }).on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.user_id === recipientId) { setUserStatus(t('chat.typingStatus', 'друкує...')); if (typingTimeout.current) clearTimeout(typingTimeout.current); typingTimeout.current = setTimeout(() => { const presenceState = channel.current.presenceState(); const recipientIsOnline = Object.keys(presenceState).some(key => key === recipientId); setUserStatus(recipientIsOnline ? t('chat.onlineStatus', 'в мережі') : (recipientLastSeen ? moment(recipientLastSeen).fromNow() : t('chat.offlineStatus', 'не в мережі'))); }, 2000); } }).subscribe(async (status) => { if (status === 'SUBSCRIBED') { await channel.current.track({ online_at: new Date().toISOString() }); } });
        const appStateSubscription = AppState.addEventListener('change', nextAppState => { if (nextAppState === 'active') { channel.current?.track({ online_at: new Date().toISOString() }); } else { supabase.rpc('update_last_seen'); channel.current?.untrack(); } });
        return () => { appStateSubscription.remove(); if (channel.current) { channel.current.untrack(); supabase.removeChannel(channel.current); } };
    }, [roomId, recipientId, session]);

    // ОНОВЛЕНА ФУНКЦІЯ ВІДПРАВКИ ПОВІДОМЛЕННЯ
    const sendMessage = async (messageContent, notificationContent) => {
        if (!roomId || !session) return;
        const tempId = Math.random();
        const newMessage = { room_id: roomId, sender_id: session.user.id, ...messageContent };
        
        // 1. Оптимістично оновлюємо UI
        setMessages(prev => [{...newMessage, id: tempId, created_at: new Date().toISOString(), status: 'sent'}, ...prev]);
        
        // 2. Зберігаємо повідомлення в базі
        const { error: insertError } = await supabase.from('messages').insert([newMessage]);
        
        if (insertError) {
            console.error("Error sending message:", insertError);
            setMessages(prev => prev.filter(msg => msg.id !== tempId)); // Видаляємо, якщо помилка
            Alert.alert(t('common.error'), insertError.message);
            return;
        }

        // 3. Викликаємо функцію для push-сповіщення
        const { error: rpcError } = await supabase.rpc('send_push_notification', {
            p_room_id: roomId,
            p_message_content: notificationContent
        });
        if (rpcError) {
            console.error("Error triggering push notification:", rpcError);
        }
    };

    const handleSendText = () => {
        const textToSend = inputText.trim();
        if (textToSend.length > 0) {
            sendMessage({ content: textToSend }, textToSend);
            setInputText('');
        }
    };
    
    const uploadAndSendImage = async (asset) => {
        try {
            const fileExt = asset.uri.split('.').pop().toLowerCase();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
            const contentType = asset.mimeType || `image/${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, decode(asset.base64), { contentType, upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath);
            await sendMessage({ image_url: urlData.publicUrl }, t('chat.sentAnImage', 'Надіслав(ла) зображення'));
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        }
    };

    // ✨ СПРОЩЕНА ФУНКЦІЯ ВИБОРУ ЗОБРАЖЕННЯ
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });
    
        if (!result.canceled) {
            uploadAndSendImage(result.assets[0]);
        }
    };

    // ✨ СПРОЩЕНА ФУНКЦІЯ ЗЙОМКИ ФОТО
    const takePhoto = async () => {
        setAttachmentModalVisible(false);
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled) {
            uploadAndSendImage(result.assets[0]);
        }
    };

    const handleSendLocation = async () => {
        setAttachmentModalVisible(false);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert(t('common.error'), t('chat.locationPermissionError')); return; }
        let location = await Location.getCurrentPositionAsync({});
        await sendMessage({ location: { latitude: location.coords.latitude, longitude: location.coords.longitude } }, t('chat.sentLocation', 'Поділився(лась) геолокацією'));
    };

    const handleTyping = (text) => { setInputText(text); if (channel.current) { channel.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id } }); } };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><View style={styles.headerUserInfo}><Text style={styles.headerUserName}>{recipientName}</Text><Text style={styles.headerUserStatus}>{userStatus}</Text></View><Image source={recipientAvatar ? { uri: recipientAvatar } : require('../assets/default-avatar.png')} style={styles.headerAvatar} /></View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
                {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" /> : <FlatList data={messages} renderItem={({ item }) => <MessageBubble message={item} currentUserId={session.user.id} onImagePress={setViewingImageUri} />} keyExtractor={item => item.id.toString()} inverted contentContainerStyle={{ padding: 10 }} style={{ flex: 1 }} />}
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}><Ionicons name="add" size={30} color={colors.secondaryText} /></TouchableOpacity>
                    <TextInput style={styles.textInput} placeholder={t('chat.placeholder')} placeholderTextColor={colors.secondaryText} value={inputText} onChangeText={handleTyping} />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendText}><Ionicons name="paper-plane" size={24} color="#fff" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <Modal animationType="slide" transparent={true} visible={isAttachmentModalVisible} onRequestClose={() => setAttachmentModalVisible(false)}><Pressable style={styles.modalBackdrop} onPress={() => setAttachmentModalVisible(false)}><View style={styles.modalContent}><TouchableOpacity style={styles.modalButton} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.takePhoto')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalButton} onPress={pickImage}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.pickFromGallery')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalButton} onPress={handleSendLocation}><Ionicons name="location-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.shareLocation')}</Text></TouchableOpacity></View></Pressable></Modal>
            <ImageViewerModal visible={!!viewingImageUri} uri={viewingImageUri} onClose={() => setViewingImageUri(null)} />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerUserInfo: { flex: 1, alignItems: 'center' },
    headerUserName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    messageRow: { flexDirection: 'row', marginVertical: 4 },
    messageBubble: { borderRadius: 20, padding: 10, maxWidth: '75%' },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4, alignSelf: 'flex-end' },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4, alignSelf: 'flex-start' },
    messageText: { color: colors.text, fontSize: 15 },
    myMessageText: { color: '#FFFFFF' },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    messageMap: { width: 220, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center', gap: 4 },
    messageInfoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    messageTime: { color: colors.secondaryText, fontSize: 11 },
    myMessageTime: { color: '#FFFFFF' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 10, color: colors.text },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.text, fontSize: 18, marginLeft: 15 },
    imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeButton: { position: 'absolute', top: 50, right: 20, padding: 10 },
});
