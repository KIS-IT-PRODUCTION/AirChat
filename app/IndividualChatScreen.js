import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, SafeAreaView, SectionList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Pressable, Linking, AppState } from 'react-native';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
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

const MessageBubble = ({ message, currentUserId, onImagePress, onLongPress }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const isMyMessage = message.sender_id === currentUserId;
    const isRead = message.status === 'read';
    const isSending = message.status === 'sending';

    const openMap = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${message.location.latitude},${message.location.longitude}`;
        const label = t('chat.locationLabel', 'Геолокація');
        const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` });
        Linking.openURL(url);
    };
    return (
        <TouchableOpacity onLongPress={() => isMyMessage && onLongPress(message)} activeOpacity={0.8}>
            <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}>
                    <View>
                        {message.content && <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text>}
                        {message.image_url && <TouchableOpacity onPress={() => onImagePress(message.image_url)}><Image source={{ uri: message.image_url }} style={styles.messageImage} /></TouchableOpacity>}
                        {message.location && <TouchableOpacity onPress={openMap}><MapView style={styles.messageMap} initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={message.location} /></MapView></TouchableOpacity>}
                    </View>
                    <View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}>
                        <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>
                        {isMyMessage && <Ionicons name={isSending ? "time-outline" : (isRead ? "checkmark-done" : "checkmark")} size={16} color={isRead ? "#4FC3F7" : "#FFFFFF90"} />}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
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
    
    useEffect(() => { moment.locale(i18n.language); }, [i18n.language]);

    const { roomId: initialRoomId, recipientId, recipientName, recipientAvatar, recipientLastSeen: initialLastSeen } = route.params;
    
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
    const [userStatus, setUserStatus] = useState('');
    const [realtimeLastSeen, setRealtimeLastSeen] = useState(initialLastSeen);
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [isSendingLocation, setIsSendingLocation] = useState(false);
    const [isRecipientOnline, setIsRecipientOnline] = useState(false);

    const typingTimeout = useRef(null);
    const channel = useRef(null);
 useEffect(() => {
        console.log('--- ДІАГНОСТИКА ЕКРАНУ ЧАТУ ---');
        console.log('ID Поточного Користувача (я):', session?.user?.id);
        console.log('ID Співрозмовника (він/вона):', route.params?.recipientId);
        console.log('------------------------------------');},);
    const formatUserStatus = useCallback((isOnline, lastSeen) => {
        if (isOnline) return t('chat.onlineStatus');
        if (!lastSeen) return t('chat.offlineStatus');
        const now = moment();
        const lastSeenMoment = moment(lastSeen);
        if (!lastSeenMoment.isValid()) return t('chat.offlineStatus');
        const diffMinutes = now.diff(lastSeenMoment, 'minutes');
        if (diffMinutes < 1) return t('chat.lastSeen.justNow');
        if (diffMinutes < 60) return t('chat.lastSeen.minutesAgo', { count: diffMinutes });
        if (now.isSame(lastSeenMoment, 'day')) return t('chat.lastSeen.todayAt', { time: lastSeenMoment.format('HH:mm') });
        if (now.clone().subtract(1, 'day').isSame(lastSeenMoment, 'day')) return t('chat.lastSeen.yesterdayAt', { time: lastSeenMoment.format('HH:mm') });
        return t('chat.lastSeen.onDate', { date: lastSeenMoment.format('D MMMM YYYY') });
    }, [t]);

    const handleBackPress = () => { navigation.navigate('ChatList'); };

    const markAsRead = useCallback(async (roomIdToUpdate) => {
        if (!roomIdToUpdate) return;
        try {
            await supabase.rpc('mark_messages_as_read', { p_room_id: roomIdToUpdate });
        } catch (error) {
            console.error("Error marking messages as read:", error.message);
        }
    }, []);

    const groupMessagesByDate = (messagesToGroup) => {
        if (!messagesToGroup || messagesToGroup.length === 0) return [];
        const grouped = messagesToGroup.reduce((acc, message) => {
            const date = moment(message.created_at).startOf('day').format('YYYY-MM-DD');
            if (!acc[date]) acc[date] = [];
            acc[date].push(message);
            return acc;
        }, {});
        return Object.keys(grouped).map(date => ({ title: date, data: grouped[date].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) })).sort((a, b) => new Date(b.title) - new Date(a.title));
    };

    const sections = groupMessagesByDate(messages);

    const formatDateHeader = (dateStr) => {
        const date = moment(dateStr, 'YYYY-MM-DD');
        if (date.isSame(moment(), 'day')) return t('chat.today');
        if (date.isSame(moment().subtract(1, 'day'), 'day')) return t('chat.yesterday');
        return date.format('D MMMM YYYY');
    };

    const fetchMessages = useCallback(async (roomId) => {
        const { data: messagesData, error: messagesError } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
        if (messagesError) throw messagesError;
        setMessages(messagesData || []);
        await markAsRead(roomId);
    }, [markAsRead]);

    useEffect(() => {
        setUserStatus(formatUserStatus(isRecipientOnline, realtimeLastSeen));
    }, [isRecipientOnline, realtimeLastSeen, formatUserStatus]);

    useEffect(() => {
        let profileSubscription;
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
                
                await fetchMessages(roomId);
                
                // --- ⬇️ ОСЬ ЦЕ ВИПРАВЛЕННЯ ⬇️ ---
                channel.current = supabase.channel(`room-${roomId}`, {
                  config: {
                    presence: {
                      key: session.user.id,
                    },
                  },
                });
                
                channel.current
                    .on('postgres_changes', 
                        { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, 
                        (payload) => {
                            if (payload.eventType === 'INSERT') {
                                setMessages(prev => {
                                    if (prev.some(msg => msg.id === payload.new.id)) return prev;
                                    return [payload.new, ...prev];
                                });
                                if (payload.new.sender_id !== session.user.id) markAsRead(roomId);
                            } else if (payload.eventType === 'UPDATE') {
                                setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
                            } else if (payload.eventType === 'DELETE') {
                                setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
                            }
                        }
                    )
                    .on('presence', { event: 'sync' }, () => {
                        const presenceState = channel.current.presenceState();
                        const recipientIsOnline = Object.keys(presenceState).some(key => key === recipientId);
                        setIsRecipientOnline(recipientIsOnline);
                    })
                    .on('presence', { event: 'join' }, ({ key }) => { 
                        if (key === recipientId) setIsRecipientOnline(true);
                    })
                    .on('presence', { event: 'leave' }, ({ key }) => { 
                        if (key === recipientId) setIsRecipientOnline(false);
                    })
                    .on('broadcast', { event: 'typing' }, ({ payload }) => {
                        if (payload.user_id === recipientId) {
                            setUserStatus(t('chat.typingStatus'));
                            if (typingTimeout.current) clearTimeout(typingTimeout.current);
                            typingTimeout.current = setTimeout(() => {
                                const presenceState = channel.current.presenceState();
                                const isOnline = Object.keys(presenceState).some(key => key === recipientId);
                                setIsRecipientOnline(isOnline);
                            }, 2000);
                        }
                    })
                    .subscribe(async (status) => { if (status === 'SUBSCRIBED') { await channel.current.track({ online_at: new Date().toISOString() }); } });

                profileSubscription = supabase
                    .channel(`public:profiles:id=eq.${recipientId}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${recipientId}` }, payload => {
                        const newLastSeen = payload.new.last_seen;
                        setRealtimeLastSeen(newLastSeen);
                    })
                    .subscribe();

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
            if (channel.current) supabase.removeChannel(channel.current);
            if (profileSubscription) supabase.removeChannel(profileSubscription);
        };
    }, [recipientId, session, fetchMessages, markAsRead]);


    const sendMessage = async (messageContent, notificationContent) => {
        if (!currentRoomId || !session) return null;

        const dbMessage = { room_id: currentRoomId, sender_id: session.user.id, ...messageContent };
        
        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert([dbMessage])
            .select()
            .single();

        if (error) {
            console.error("Error sending message:", error);
            Alert.alert(t('common.error'), error.message);
            return null;
        }
        
        supabase.functions.invoke('send-push-notification', {
            body: {
                recipient_id: recipientId,
                sender_id: session.user.id,
                message_content: notificationContent,
            }
        }).catch(funcError => {
            console.error("Error triggering push notification:", funcError);
        });
        
        return newMessage;
    };

    const handleEditMessage = async () => {
        if (!editingMessage || !inputText.trim()) return;
        const newContent = inputText.trim();
        const originalContent = editingMessage.content;
        
        setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: newContent } : msg));
        setEditingMessage(null);
        setInputText('');

        const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', editingMessage.id);
        if (error) {
            Alert.alert(t('common.error'), error.message);
            setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: originalContent } : msg));
        }
    };

    const handleDeleteMessage = (messageId) => {
        Alert.alert(t('chat.deleteConfirmTitle'), t('chat.deleteConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                const originalMessages = [...messages];
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                const { error } = await supabase.from('messages').delete().eq('id', messageId);
                if (error) {
                    Alert.alert(t('common.error'), error.message);
                    setMessages(originalMessages);
                }
            }}
        ]);
    };

    const handleSendText = async () => {
        const textToSend = inputText.trim();
        if (textToSend.length > 0) {
            setInputText('');
            const newMessage = await sendMessage({ content: textToSend }, textToSend);
            if (newMessage) {
                setMessages(prevMessages => [newMessage, ...prevMessages]);
            } else {
                setInputText(textToSend);
            }
        }
    };
    
    const uploadAndSendImage = async (asset) => {
        try {
            const fileExt = asset.uri.split('.').pop().toLowerCase();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
            const contentType = asset.mimeType || `image/${fileExt}`;
            const formData = new FormData();
            formData.append('file', {
                uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
                name: filePath,
                type: contentType,
            });
            const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, formData, { upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath);
            
            const newMessage = await sendMessage({ image_url: urlData.publicUrl }, t('chat.sentAnImage', 'Надіслав(ла) зображення'));
            if (newMessage) {
                setMessages(prev => [newMessage, ...prev]);
            }

        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        }
    };

    const pickImage = async () => {
        setAttachmentModalVisible(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert(t('common.error'), t('settings.galleryPermissionError')); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.8,
        });
        if (!result.canceled) {
            setTimeout(() => uploadAndSendImage(result.assets[0]), 100);
        }
    };

    const takePhoto = async () => {
        setAttachmentModalVisible(false);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert(t('common.error'), t('settings.cameraPermissionError')); return; }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, quality: 0.8,
        });
        if (!result.canceled) {
            setTimeout(() => uploadAndSendImage(result.assets[0]), 100);
        }
    };

    const handleSendLocation = async () => {
        setAttachmentModalVisible(false);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('chat.locationPermissionError'));
            return;
        }
        setIsSendingLocation(true);
        try {
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const locationData = { latitude: location.coords.latitude, longitude: location.coords.longitude };
            
            const newMessage = await sendMessage({ location: locationData }, t('chat.sentLocation', 'Поділився(лась) геолокацією'));
            if (newMessage) {
                setMessages(prev => [newMessage, ...prev]);
            }

        } catch (error) {
            console.error("Error getting location:", error);
            Alert.alert(t('common.error'), t('chat.locationFetchError'));
        } finally {
            setIsSendingLocation(false);
        }
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
                <TouchableOpacity onPress={handleBackPress}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
                <View style={styles.headerUserInfo}><Text style={styles.headerUserName}>{recipientName}</Text><Text style={styles.headerUserStatus}>{userStatus}</Text></View>
                <Image source={recipientAvatar ? { uri: recipientAvatar } : require('../assets/default-avatar.png')} style={styles.headerAvatar} />
            </View>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary}/> : 
                    <SectionList
                        sections={sections}
                        keyExtractor={(item, index) => item.id.toString() + index}
                        renderItem={({ item }) => 
                            <MessageBubble 
                                message={item} 
                                currentUserId={session?.user?.id} 
                                onImagePress={setViewingImageUri}
                                onLongPress={(message) => {
                                    if (message.sender_id === session.user.id) {
                                        Alert.alert(
                                            t('chat.messageActions'), null,
                                            [
                                                { text: t('chat.edit'), onPress: () => { if (message.content) { setEditingMessage(message); setInputText(message.content); } } },
                                                { text: t('chat.delete'), onPress: () => handleDeleteMessage(message.id), style: 'destructive' },
                                                { text: t('common.cancel'), style: 'cancel' },
                                            ],
                                            { cancelable: true }
                                        );
                                    }
                                }}
                            />
                        }
                        renderSectionFooter={({ section: { title } }) => ( <View style={styles.dateHeader}><Text style={styles.dateHeaderText}>{formatDateHeader(title)}</Text></View> )}
                        inverted
                        contentContainerStyle={{ padding: 10, flexGrow: 1, justifyContent: 'flex-end' }}
                        style={{ flex: 1 }}
                    />
                }
                <View style={styles.inputContainer}>
                    {editingMessage && (
                        <View style={styles.editingBanner}>
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                            <Text style={styles.editingText}>{t('chat.editing')}</Text>
                            <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                                <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
                            </TouchableOpacity>
                        </View>
                    )}
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}><Ionicons name="add" size={30} color={colors.secondaryText} /></TouchableOpacity>
                    <TextInput style={styles.textInput} value={inputText} onChangeText={handleTyping} placeholder={t('chat.placeholder')} placeholderTextColor={colors.secondaryText} />
                    <TouchableOpacity style={styles.sendButton} onPress={editingMessage ? handleEditMessage : handleSendText}>
                        <Ionicons name={editingMessage ? "checkmark" : "paper-plane"} size={24} color="#fff" />
                    </TouchableOpacity>
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
            {isSendingLocation && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>{t('chat.fetchingLocation', 'Отримання точної локації...')}</Text>
                </View>
            )}
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
    dateHeader: { alignSelf: 'center', backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginVertical: 10 },
    dateHeaderText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },
    editingBanner: { position: 'absolute', top: -35, left: 0, right: 0, backgroundColor: colors.card, paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    editingText: { color: colors.primary, fontWeight: 'bold', marginLeft: 8, flex: 1 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
});