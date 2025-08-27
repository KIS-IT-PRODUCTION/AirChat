import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Pressable, Linking, AppState } from 'react-native';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/uk'; // Імпорт української локалі для moment.js
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useAuth } from '../provider/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { decode } from 'base64-arraybuffer';
import MapView, { Marker } from 'react-native-maps';

// --- Допоміжні компоненти ---
const ImageViewerModal = ({ visible, uri, onClose }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    if (!uri) return null;
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.imageViewerBackdrop} onPress={onClose}>
                <Image source={{ uri }} style={styles.fullScreenImage} resizeMode="contain" />
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close-circle" size={32} color="white" />
                </TouchableOpacity>
            </Pressable>
        </Modal>
    );
};

const MessageBubble = ({ message, currentUserId, onImagePress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const isMyMessage = message.sender_id === currentUserId;
    const isRead = message.status === 'read';
    const openMap = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${message.location.latitude},${message.location.longitude}`;
        const label = t('chat.locationLabel', 'Геолокація');
        const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` });
        Linking.openURL(url);
    };
    return (
        <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}>
                <View>
                    {message.content && <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text>}
                    {message.image_url && <TouchableOpacity onPress={() => onImagePress(message.image_url)}><Image source={{ uri: message.image_url }} style={styles.messageImage} /></TouchableOpacity>}
                    {message.location && <TouchableOpacity onPress={openMap}><MapView style={styles.messageMap} initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={message.location} /></MapView></TouchableOpacity>}
                </View>
                <View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}>
                    <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>
                    {isMyMessage && <Ionicons name={isRead ? "checkmark-done" : "checkmark"} size={16} color={isRead ? "#4FC3F7" : "#FFFFFF90"} />}
                </View>
            </View>
        </View>
    );
};

// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = getStyles(colors);
    const route = useRoute();
    const navigation = useNavigation();
    const { session } = useAuth();
    
    moment.locale(i18n.language); // Встановлюємо локаль для moment.js

    const { roomId: initialRoomId, recipientId, recipientName, recipientAvatar, recipientLastSeen } = route.params;
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
    const [userStatus, setUserStatus] = useState('');
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    
    const typingTimeout = useRef(null);
    const channel = useRef(null);

  const formatUserStatus = useCallback((isOnline, lastSeen) => {
        if (isOnline) {
            return t('chat.onlineStatus');
        }
        if (!lastSeen) {
            return t('chat.offlineStatus');
        }

        try {
            const now = moment();
            const lastSeenMoment = moment(lastSeen);

            // Перевірка, чи дата валідна
            if (!lastSeenMoment.isValid()) {
                console.error("Invalid date received for lastSeen:", lastSeen);
                return t('chat.offlineStatus');
            }

            const diffMinutes = now.diff(lastSeenMoment, 'minutes');

            if (diffMinutes < 1) return t('chat.lastSeen.justNow');
            if (diffMinutes < 60) return t('chat.lastSeen.minutesAgo', { count: diffMinutes });
            if (now.isSame(lastSeenMoment, 'day')) {
                const time = lastSeenMoment.format('HH:mm');
                return t('chat.lastSeen.todayAt', { time });
            }
            if (now.clone().subtract(1, 'day').isSame(lastSeenMoment, 'day')) {
                const time = lastSeenMoment.format('HH:mm');
                return t('chat.lastSeen.yesterdayAt', { time });
            }
            
            const date = lastSeenMoment.format('D MMM');
            return t('chat.lastSeen.onDate', { date });

        } catch (error) {
            console.error("Error formatting user status:", error);
            return t('chat.offlineStatus'); // Повертаємо безпечне значення у разі помилки
        }
    }, [t]);


    const handleBackPress = () => {
        navigation.navigate('ChatList');
    };

    const markAsRead = useCallback(async (roomIdToUpdate) => {
        if (!roomIdToUpdate) return;
        try {
            await supabase.rpc('mark_messages_as_read', { p_room_id: roomIdToUpdate });
        } catch (error) {
            console.error("Error marking messages as read:", error.message);
        }
    }, []);

    useEffect(() => {
        setUserStatus(formatUserStatus(false, recipientLastSeen));

        const initializeChat = async () => {
            if (!session || !recipientId) { setLoading(false); return; }
            setLoading(true);
            try {
                let roomId = currentRoomId;
                if (!roomId) {
                    const { data, error } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: recipientId });
                    if (error) throw error;
                    roomId = data;
                    setCurrentRoomId(data);
                }
                if (!roomId) { setLoading(false); return; }
                
                const { data: messagesData, error: messagesError } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
                if (messagesError) throw messagesError;
                setMessages(messagesData || []);
                await markAsRead(roomId);
                
                channel.current = supabase.channel(`room-${roomId}`, { config: { presence: { key: session.user.id } } });
                
                channel.current
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, payload => {
                        if (payload.eventType === 'INSERT') {
                            setMessages(prev => [payload.new, ...prev]);
                            if (payload.new.sender_id !== session.user.id) {
                                markAsRead(roomId);
                            }
                        } else if (payload.eventType === 'UPDATE') {
                            setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
                        }
                    })
                    .on('presence', { event: 'sync' }, () => {
                        const presenceState = channel.current.presenceState();
                        const recipientIsOnline = Object.keys(presenceState).some(key => key === recipientId);
                        setUserStatus(formatUserStatus(recipientIsOnline, recipientLastSeen));
                    })
                    .on('presence', { event: 'join' }, ({ key }) => {
                        if (key === recipientId) setUserStatus(formatUserStatus(true, null));
                    })
                    .on('presence', { event: 'leave' }, ({ key }) => {
                        if (key === recipientId) setUserStatus(formatUserStatus(false, new Date().toISOString()));
                    })
                    .on('broadcast', { event: 'typing' }, ({ payload }) => {
                        if (payload.user_id === recipientId) {
                            setUserStatus(t('chat.typingStatus'));
                            if (typingTimeout.current) clearTimeout(typingTimeout.current);
                            typingTimeout.current = setTimeout(() => {
                                const presenceState = channel.current.presenceState();
                                const isOnline = Object.keys(presenceState).some(key => key === recipientId);
                                setUserStatus(formatUserStatus(isOnline, recipientLastSeen));
                            }, 2000);
                        }
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            await channel.current.track({ online_at: new Date().toISOString() });
                        }
                    });

            } catch (error) { console.error("Error initializing chat:", error); Alert.alert(t('common.error'), error.message); } 
            finally { setLoading(false); }
        };

        initializeChat();
        
        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                channel.current?.track({ online_at: new Date().toISOString() });
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                supabase.rpc('update_last_seen');
                channel.current?.untrack();
            }
        });

        return () => {
            appStateSubscription.remove();
            if (channel.current) {
                channel.current.untrack();
                supabase.removeChannel(channel.current);
            }
        };
    }, [recipientId, session, formatUserStatus, recipientLastSeen]);

    const sendMessage = async (messageContent, notificationContent) => {
        if (!currentRoomId || !session) return;
        const tempId = Math.random();
        const newMessage = { room_id: currentRoomId, sender_id: session.user.id, ...messageContent };
        
        setMessages(prev => [{...newMessage, id: tempId, created_at: new Date().toISOString(), status: 'sent'}, ...prev]);
        
        const { error: insertError } = await supabase.from('messages').insert([newMessage]);
        
        if (insertError) {
            console.error("Error sending message:", insertError);
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            Alert.alert(t('common.error'), insertError.message);
            return;
        }

        const { error: rpcError } = await supabase.rpc('send_push_notification', {
            p_room_id: currentRoomId,
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

    const pickImage = async () => {
        setAttachmentModalVisible(false);
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
    
    const handleTyping = (text) => {
        setInputText(text);
        if (channel.current) {
            channel.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { user_id: session.user.id }
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                    <Text style={styles.headerUserName}>{recipientName}</Text>
                    <Text style={styles.headerUserStatus}>{userStatus}</Text>
                </View>
                <Image source={recipientAvatar ? { uri: recipientAvatar } : require('../assets/default-avatar.png')} style={styles.headerAvatar} />
            </View>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary}/> : 
                    <FlatList 
                        data={messages} 
                        renderItem={({ item }) => <MessageBubble message={item} currentUserId={session.user.id} onImagePress={setViewingImageUri} />} 
                        keyExtractor={item => item.id.toString()} 
                        inverted 
                        contentContainerStyle={{ padding: 10 }} 
                        style={{ flex: 1 }} 
                    />
                }
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}><Ionicons name="add" size={30} color={colors.secondaryText} /></TouchableOpacity>
                    <TextInput style={styles.textInput} placeholder={t('chat.placeholder')} placeholderTextColor={colors.secondaryText} value={inputText} onChangeText={handleTyping} />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendText}><Ionicons name="paper-plane" size={24} color="#fff" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <Modal animationType="slide" transparent={true} visible={isAttachmentModalVisible} onRequestClose={() => setAttachmentModalVisible(false)}>
                <Pressable style={styles.modalBackdrop} onPress={() => setAttachmentModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.modalButton} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.takePhoto')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImage}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.pickFromGallery')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleSendLocation}><Ionicons name="location-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.shareLocation')}</Text></TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
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