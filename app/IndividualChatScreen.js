// IndividualChatScreen.js

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
    StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
    Pressable, Linking, RefreshControl, Clipboard, AppState, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import { useTranslation } from 'react-i18next';
import { supabase } from '../config/supabase';
import { useAuth } from '../provider/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { MotiView, AnimatePresence } from 'moti';
import TypingIndicator from '../app/components/TypingIndicator.js'; // Припускається, що шлях правильний
import { useUnreadCount } from '../provider/Unread Count Context.js';
import Hyperlink from 'react-native-hyperlink';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import ImageViewing from 'react-native-image-viewing'; 

// --- КОНСТАНТИ ТА ДОПОМІЖНІ ФУНКЦІЇ ---
const LOADING_FADE_DELAY = 300; 

const formatUserStatus = (isOnline, lastSeen, t) => { 
    if (isOnline) return t('chat.onlineStatus'); 
    if (!lastSeen) return t('chat.offlineStatus'); 
    const lsMoment = moment(lastSeen); 
    if (!lsMoment.isValid()) return t('chat.offlineStatus'); 
    if (moment().diff(lsMoment, 'seconds') < 60) return t('chat.onlineStatus'); 
    if (moment().isSame(lsMoment, 'day')) return t('chat.lastSeen.todayAt', { time: lsMoment.format('HH:mm') }); 
    if (moment().clone().subtract(1, 'day').isSame(lsMoment, 'day')) return t('chat.lastSeen.yesterdayAt', { time: lsMoment.format('HH:mm') }); 
    return t('chat.lastSeen.onDate', { date: lsMoment.format('D MMMM YYYY') }); 
};

// --- СТИЛІ (Для цілісності, припускається, що getStyles визначений) ---
// (Стилі getStyles... тут має бути функція, яка повертає StyleSheet.create)
const getStyles = (colors) => StyleSheet.create({
    selectionCircleContainer: { width: 40, justifyContent: 'center', alignItems: 'center' },
    selectionCircleEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.secondaryText },
    selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? 25 : 5, backgroundColor: colors.card },
    selectionCountText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    dateSeparator: { alignSelf: 'center', backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginVertical: 10 },
    dateSeparatorText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center',  
        justifyContent: 'space-between',
        paddingHorizontal: 12, 
        paddingVertical: 5, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border, 
        paddingTop: 0, 
        backgroundColor: colors.card 
    },
    headerUserInfo: { alignItems: 'center', paddingHorizontal: 10, },
    headerUserName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
    messageContainer: { marginVertical: 2, paddingHorizontal: 0},
    messageRow: { flexDirection: 'row', alignItems: 'center' },
    messageBubble: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#FFFFFF' },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    imageLoadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15 },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 15 },
    messageMap: { width: 220, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center', gap: 4 },
    messageInfoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    messageTime: { color: colors.secondaryText, fontSize: 11 },
    myMessageTime: { color: '#FFFFFF90' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopColor: colors.border, backgroundColor: colors.card, borderRadius: 30, paddingHorizontal:10, paddingVertical:5, },
    textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 0, marginHorizontal: 10, color: colors.text, maxHeight: 120, fontSize: 16 },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    reactionsContainer: { flexDirection: 'row', marginTop: -8, marginLeft: 10, marginRight: 10, zIndex: 10, position: 'relative' },
    reactionBadge: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    reactionBadgeText: { fontSize: 12, color: colors.text },
    modalBackdropAttachments: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.primary, fontSize: 18, marginLeft: 15 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },
    actionSheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', },
    actionSheetContainer: { marginHorizontal: 10, },
    reactionPickerContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 20, padding: 8, justifyContent: 'space-around', alignItems: 'center', marginBottom: 8, elevation: 4, shadowOpacity: 0.1, shadowRadius: 5, },
    actionButtonsContainer: { backgroundColor: colors.card, borderRadius: 20, },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, },
    actionButtonText: { color: colors.text, fontSize: 18, marginLeft: 15, },
    cancelButton: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 8, alignItems: 'center', },
    cancelButtonText: { color: colors.primary, fontSize: 18, fontWeight: '600', },
});
// --- КІНЕЦЬ СТИЛІВ ---

// --- ДОПОМІЖНІ КОМПОНЕНТИ (ПОВТОРЮЮТЬСЯ) ---
// (Всі memo компоненти залишаються тут для цілісності)

const SelectionHeader = memo(({ selectionCount, onCancel, onDelete, colors }) => {
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
});

const SelectionCircle = memo(({ isSelected }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.selectionCircleContainer}>
            <AnimatePresence>
                {isSelected ? (
                    <MotiView from={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                    </MotiView>
                ) : (
                    <MotiView
                        from={{ scale: 1 }} animate={{ scale: 1 }}
                        style={styles.selectionCircleEmpty}
                    />
                )}
            </AnimatePresence>
        </View>
    );
});

const DateSeparator = memo(({ date }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation();
    const formattedDate = useMemo(() => moment(date).calendar(null, { sameDay: `[${t('dates.today', 'Сьогодні')}]`, lastDay: `[${t('dates.yesterday', 'Вчора')}]`, lastWeek: 'dddd', sameElse: 'D MMMM YYYY' }), [date, t]);
    return (<View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>{formattedDate}</Text></View>);
});

const ImageViewerModal = memo(({ visible, uri, onClose }) => {
    const images = useMemo(() => (uri ? [{ uri }] : []), [uri]);
    if (!uri) return null;

    return (
        <ImageViewing
            images={images}
            imageIndex={0}
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
        />
    );
});

const MessageActionSheet = memo(({ visible, onClose, message, isMyMessage, onCopy, onEdit, onDelete, onReact, onSelect }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    if (!message) return null;
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const handleAction = (action) => { action(); onClose(); };
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.actionSheetBackdrop} onPress={onClose}>
                <Pressable style={[styles.actionSheetContainer, { marginBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                    <View style={styles.reactionPickerContainer}>{reactions.map(emoji => ( <TouchableOpacity key={emoji} onPress={() => handleAction(() => onReact(emoji))} style={styles.reactionEmojiButton}><Text style={styles.reactionEmojiText}>{emoji}</Text></TouchableOpacity> ))}</View>
                    <View style={styles.actionButtonsContainer}>
                        {isMyMessage && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onSelect)}><Ionicons name="checkmark-circle-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.select', 'Вибрати')}</Text></TouchableOpacity> )}
                        {message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onCopy)}><Ionicons name="copy-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.copy', 'Копіювати')}</Text></TouchableOpacity> )}
                        {isMyMessage && message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onEdit)}><Ionicons name="create-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.edit', 'Редагувати')}</Text></TouchableOpacity> )}
                        {isMyMessage && ( <TouchableOpacity style={[styles.actionButton, { borderBottomWidth: 0 }]} onPress={() => handleAction(onDelete)}><Ionicons name="trash-outline" size={22} color={'#D83C3C'} /><Text style={[styles.actionButtonText, { color: '#D83C3C' }]}>{t('common.delete', 'Видалити')}</Text></TouchableOpacity> )}
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Скасувати')}</Text></TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

const MessageBubble = memo(({ message, currentUserId, onImagePress, onLongPress, onDoubleTap, onSelect, selectionMode, isSelected, isInitialLoad }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation(); const isMyMessage = message.sender_id === currentUserId; const lastTap = useRef(0);
    const [isPressed, setIsPressed] = useState(false);
    
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isImageCached, setIsImageCached] = useState(false);

    const handlePress = () => { if (selectionMode) { if (isMyMessage) onSelect(message.id); return; } const now = Date.now(); const DOUBLE_PRESS_DELAY = 300; if (now - lastTap.current < DOUBLE_PRESS_DELAY) { if (!isMyMessage) onDoubleTap(message); } lastTap.current = now; };
    const openMap = () => { const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' }); const latLng = `${message.location.latitude},${message.location.longitude}`; const label = t('chat.locationLabel'); const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` }); Linking.openURL(url); };
    const UploadingIndicator = () => (<View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="#FFFFFF" /></View>);
    
    // 💡 Використовуємо View, якщо isInitialLoad === false для статичності
    const Wrapper = isInitialLoad ? MotiView : View;
    const animationProps = isInitialLoad
        ? { from: { opacity: 0, scale: 0.9, translateX: isMyMessage ? 40 : -40 }, animate: { opacity: 1, scale: 1, translateX: 0 }, transition: { type: 'timing', duration: 250 } } 
        : {}; 

    return (
        <Pressable onPressIn={() => setIsPressed(true)} onPressOut={() => setIsPressed(false)} onLongPress={() => onLongPress(message)} onPress={handlePress} style={styles.messageContainer}>
            <Wrapper {...animationProps}>
                <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                    {selectionMode && isMyMessage && <SelectionCircle isSelected={isSelected} />}
                    <View style={{ maxWidth: selectionMode ? '70%' : '80%' }}>
                        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}>
                            {message.content && (<Hyperlink linkDefault={true} linkStyle={{ color: isMyMessage ? '#9ECAE8' : '#2980b9' }}><Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text></Hyperlink>)}
                            
                            {message.image_url && (
                                <TouchableOpacity onPress={() => onImagePress(message.image_url)}>
                                    <Image 
                                        source={{ uri: message.image_url }} 
                                        style={styles.messageImage} 
                                        contentFit="cover" 
                                        transition={300} 
                                        cachePolicy="disk" 
                                        placeholder={message.blurhash || 'L6Pj0^i_.AyE_3t7t7R**0o#DgR4'}
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                        onLoad={(e) => {
                                            if (e.cacheType === 'disk' || e.cacheType === 'memory') {
                                                setIsImageCached(true);
                                            }
                                        }}
                                    />
                                    {isImageLoading && !isImageCached && message.status !== 'uploading' && (
                                        <View style={styles.imageLoadingOverlay}>
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        </View>
                                    )}
                                    {message.status === 'uploading' && <UploadingIndicator />}
                                </TouchableOpacity>
                            )}

                            {message.location && <TouchableOpacity onPress={openMap}><MapView style={styles.messageMap} initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false}><Marker coordinate={message.location} /></MapView></TouchableOpacity>}
                            <View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}><Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>{isMyMessage && <Ionicons name={message.status === 'sending' || message.status === 'uploading' ? "time-outline" : (message.status === 'read' ? "checkmark-done" : "checkmark")} size={16} color={message.status === 'read' ? "#4FC3F7" : "#FFFFFF90"} />}</View>
                        </View>
                        {message.reactions && message.reactions.length > 0 && (<View style={[styles.reactionsContainer, { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}>{message.reactions.map(r => ( <View key={r.emoji} style={styles.reactionBadge}><Text style={styles.reactionBadgeText}>{r.emoji} {r.count}</Text></View> ))}</View>)}
                    </View>
                </View>
            </Wrapper>
        </Pressable>
    );
});


// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const { t, i18n } = useTranslation();
    const styles = getStyles(colors);
    const route = useRoute();
    const navigation = useNavigation();
    const { session, profile } = useAuth();
    const { fetchUnreadCount } = useUnreadCount();
    const insets = useSafeAreaInsets();
    const { roomId: initialRoomId, recipientId, recipientName, recipientAvatar, recipientLastSeen: initialLastSeen } = route.params;

    const [recipientInfo, setRecipientInfo] = useState({ name: recipientName, avatar: recipientAvatar });
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [currentRoomId, setCurrentRoomId] = useState(initialRoomId);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [isSendingLocation, setIsSendingLocation] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(false); 
    const [isRecipientOnline, setIsRecipientOnline] = useState(false);
    const [isRoomSetup, setIsRoomSetup] = useState(false);

    
    const flatListRef = useRef(null);
    const channelRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const sentSoundRef = useRef(new Audio.Sound());
    const receivedSoundRef = useRef(new Audio.Sound());
    const textInputRef = useRef(null);
    const lastSeenRef = useRef(initialLastSeen);
    const appState = useRef(AppState.currentState);

    const formatUserStatus = useCallback((isOnline, lastSeen) => { 
        if (isOnline) return t('chat.onlineStatus'); 
        if (!lastSeen) return t('chat.offlineStatus'); 
        const lsMoment = moment(lastSeen); 
        if (!lsMoment.isValid()) return t('chat.offlineStatus'); 
        if (moment().diff(lsMoment, 'seconds') < 60) return t('chat.onlineStatus'); 
        if (moment().isSame(lsMoment, 'day')) return t('chat.lastSeen.todayAt', { time: lsMoment.format('HH:mm') }); 
        if (moment().clone().subtract(1, 'day').isSame(lsMoment, 'day')) return t('chat.lastSeen.yesterdayAt', { time: lsMoment.format('HH:mm') }); 
        return t('chat.lastSeen.onDate', { date: lsMoment.format('D MMMM YYYY') }); 
    }, [t]);
    
    const userStatus = useMemo(() => {
        return formatUserStatus(isRecipientOnline, lastSeenRef.current);
    }, [isRecipientOnline, formatUserStatus]);
    
    useEffect(() => {
        moment.locale(i18n.language);
        const loadSounds = async () => {
            try {
                await sentSoundRef.current.loadAsync(require('../assets/sound/send_massege.mp3'));
                await receivedSoundRef.current.loadAsync(require('../assets/sound/get_massege.mp3'));
            } catch (error) {
                console.error("Failed to load sounds", error);
            }
        };
        loadSounds();
        return () => {
            sentSoundRef.current.unloadAsync();
            receivedSoundRef.current.unloadAsync();
        };
    }, [i18n.language]);

    const playSound = useCallback(async (soundRef) => {
        try { await soundRef.current.replayAsync(); } catch (e) { console.error('Failed to play sound', e); }
    }, []);

    const processedData = useMemo(() => {
        const itemsWithSeparators = [];
        for (let i = 0; i < messages.length; i++) {
            const currentMessage = messages[i];
            const nextMessage = messages[i + 1];

            itemsWithSeparators.push({ ...currentMessage, type: 'message' });

            const isLastMessage = !nextMessage;
            const isDifferentDay = nextMessage && !moment(currentMessage.created_at).isSame(nextMessage.created_at, 'day');

            if (isLastMessage || isDifferentDay) {
                itemsWithSeparators.push({
                    id: `date-${currentMessage.created_at}`,
                    type: 'date_separator',
                    date: currentMessage.created_at
                });
            }
        }
        return itemsWithSeparators;
    }, [messages]);

    const markAsRead = useCallback(async (roomId) => {
        if (!roomId) return;
        try {
            await supabase.rpc('mark_messages_as_read', { p_room_id: roomId });
            fetchUnreadCount();
        } catch (e) { console.error("Error marking as read:", e.message); }
    }, [fetchUnreadCount]);
    
    // 💡 ОНОВЛЕНО: Функція завантаження з плавною затримкою
    const fetchMessages = useCallback(async (roomId) => {
        if (!roomId) return;
        setIsRefreshing(true);
        const { data, error } = await supabase
            .from('messages')
            .select('*, reactions(*)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Error on focus:", error);
        } else {
            setMessages(data || []);
        }
        await markAsRead(roomId);
        setIsRefreshing(false);
        
        // Плавне зникнення індикатора
        setTimeout(() => {
            setIsLoading(false); 
        }, 300); 

    }, [markAsRead]);

    // 💡 EFFECT: ЕТАП 1 - Налаштування кімнати (Швидка підготовка UI)
    useEffect(() => {
        let isMounted = true;
        
        const setupRoom = async () => {
            if (!session || !recipientId) { return; }
            let roomId = initialRoomId;
            
            if (!roomId) {
                try {
                    const { data } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: recipientId });
                    if (!isMounted) return;
                    roomId = data;
                    setCurrentRoomId(roomId);
                } catch (e) { console.error("Error finding/creating room:", e); return; }
            }
            if (!roomId) { return; }
            
            if (isMounted) {
                setCurrentRoomId(roomId);
                setIsRoomSetup(true); // UI готовий до рендеру Header та Input
            }
        };
        
        setupRoom();

        return () => { 
            isMounted = false; 
            const channel = channelRef.current; 
            if (channel) {
                 channel.untrack().then(() => supabase.removeChannel(channel)); 
            }
        };
    }, [session, recipientId, initialRoomId]);

    // 💡 EFFECT: ЕТАП 2 - Завантаження даних та підписки (Активація Realtime)
    useEffect(() => {
        let isMounted = true;
        let profileSub;
        
        const subscribeToData = async () => {
            if (!isRoomSetup || !currentRoomId || !session) return;
            
            // 2. Завантаження повідомлень
            await fetchMessages(currentRoomId); 
            
            // 3. Налаштування підписок (Активація Realtime)
            
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            
            const roomChannel = supabase.channel(`room-${currentRoomId}`, { 
                config: { presence: { key: session.user.id, room: currentRoomId } } 
            });
            
            channelRef.current = roomChannel;
            
            const handlePresenceState = (state) => {
                const isOnline = Object.keys(state).some(key => key === recipientId);
                setIsRecipientOnline(isOnline);
            };

            // 💡 КРИТИЧНО: Повна логіка підписок для Realtime
            roomChannel
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, (payload) => {
                    setMessages(currentMessages => {
                        if (payload.new.sender_id !== session.user.id) {
                            if (currentMessages.some(m => m.id === payload.new.id)) { return currentMessages; }
                            playSound(receivedSoundRef);
                            markAsRead(currentRoomId);
                            return [payload.new, ...currentMessages];
                        }
                        const optimisticMessageIndex = currentMessages.findIndex(m => m.client_id && m.client_id === payload.new.client_id);
                        if (optimisticMessageIndex > -1) {
                            const newMessages = [...currentMessages];
                            newMessages[optimisticMessageIndex] = payload.new;
                            return newMessages;
                        } else {
                             if (currentMessages.some(m => m.id === payload.new.id)) { return currentMessages; }
                            return [payload.new, ...currentMessages];
                        }
                    });
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, (payload) => setMessages(currentMessages => currentMessages.map(m => m.id === payload.new.id ? payload.new : m)))
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${currentRoomId}` }, (payload) => {
                    setMessages(currentMessages => currentMessages.filter(m => m.id !== payload.old.id));
                })
                // 💡 МИТТЄВА АКТИВНІСТЬ: Presence Logic
                .on('presence', { event: 'sync' }, () => {
                    handlePresenceState(roomChannel.presenceState());
                })
                .on('presence', { event: 'join' }, ({ newPresences }) => {
                    if (newPresences.some(p => p.key === recipientId)) {
                        handlePresenceState(roomChannel.presenceState());
                    }
                })
                .on('presence', { event: 'leave' }, ({ leftPresences }) => {
                     if (leftPresences.some(p => p.key === recipientId)) {
                        handlePresenceState(roomChannel.presenceState());
                    }
                })
                .on('broadcast', { event: 'typing' }, ({ payload }) => {
                    if (payload.user_id === recipientId) {
                        setIsRecipientTyping(true);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsRecipientTyping(false), 2000);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        const userPresence = { room: currentRoomId, last_seen: new Date().toISOString() };
                        await roomChannel.track(userPresence); // Відстежуємо себе
                        handlePresenceState(roomChannel.presenceState()); // Оновлюємо стан одразу
                    }
                });
            
            profileSub = supabase.channel(`profile-listener-${recipientId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${recipientId}` }, (payload) => {
                lastSeenRef.current = payload.new.last_seen;
                setRecipientInfo({ name: payload.new.full_name, avatar: payload.new.avatar_url });
            }).subscribe();
        };
        
        if (isRoomSetup) {
            subscribeToData();
        }

        return () => { 
            isMounted = false; 
            const channel = channelRef.current; 
            if (profileSub) supabase.removeChannel(profileSub); 
            if (channel) {
                 channel.untrack().then(() => supabase.removeChannel(channel)); 
            }
        };
    }, [isRoomSetup, currentRoomId, session, recipientId, fetchMessages, markAsRead, playSound]);

    useFocusEffect(useCallback(() => {
        const enterChat = async () => {
             if (session) {
                 supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();
             }
             if (currentRoomId) {
                 markAsRead(currentRoomId);
             }
        };
        enterChat();
        return () => {
            if (session) {
                supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id).then();
            }
        };
    }, [currentRoomId, session, markAsRead]));
    
    // 💡 ОНОВЛЕНО: Надсилання повідомлень (Handling errors)
    const sendMessage = useCallback(async (messageData) => {
        if (!currentRoomId || !session) return;
        const { error } = await supabase.from('messages').insert([{ ...messageData, room_id: currentRoomId, sender_id: session.user.id }]);
        
        if (error) { 
            Alert.alert(t('common.error'), error.message); 
            // КРИТИЧНО: Видаляємо оптимістичне повідомлення при помилці
            setMessages(prev => prev.filter(m => m.client_id !== messageData.client_id)); 
        } else {
            supabase.functions.invoke('send-push-notification', { body: { recipient_id: recipientId, room_id: currentRoomId, sender_id: session.user.id, message_content: messageData.content || (messageData.image_url ? t('chat.sentAnImage') : t('chat.sentLocation')), sender_name: profile?.full_name, sender_avatar: profile?.avatar_url, sender_last_seen: new Date().toISOString() }}).catch(e => console.error("Push notification function error:", e));
        }
    }, [currentRoomId, session, t, recipientId, profile]);

    const handleSendText = useCallback(async () => {
        if (editingMessage) { handleEditMessage(); return; }
        const textToSend = inputText.trim();
        if (textToSend.length === 0) return;
        const clientId = uuidv4();
        const optimisticMessage = { id: clientId, client_id: clientId, created_at: new Date().toISOString(), sender_id: session.user.id, room_id: currentRoomId, content: textToSend, status: 'sending', reactions: [] };
        setMessages(prev => [optimisticMessage, ...prev]);
        setInputText('');
        playSound(sentSoundRef);
        await sendMessage({ content: textToSend, client_id: clientId });
    }, [editingMessage, inputText, sendMessage, session, currentRoomId, playSound]);

    const uploadAndSendImage = useCallback(async (asset) => {
        const clientId = uuidv4();
        const optimisticMessage = { id: clientId, client_id: clientId, room_id: currentRoomId, sender_id: session.user.id, image_url: asset.uri, created_at: new Date().toISOString(), status: 'uploading', reactions: [] };
        setMessages(prev => [optimisticMessage, ...prev]);
        playSound(sentSoundRef);
        try {
            const fileExt = asset.uri.split('.').pop().toLowerCase();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
            const formData = new FormData();
            formData.append('file', { uri: asset.uri, name: filePath, type: `image/${fileExt}` });
            const { error: uploadError } = await supabase.storage.from('chat_images').upload(filePath, formData);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(filePath);
            await sendMessage({ image_url: urlData.publicUrl, client_id: clientId, blurhash: asset.blurhash });
        } catch (e) { Alert.alert(t('common.error'), e.message); setMessages(prev => prev.filter(m => m.client_id !== clientId)); }
    }, [session, sendMessage, t, currentRoomId, playSound]);

    const handleSendLocation = useCallback(async () => {
        setAttachmentModalVisible(false);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert(t('chat.permissionDeniedTitle'), t('chat.locationPermissionDenied')); return; }
        setIsSendingLocation(true);
        try {
            let { coords } = await Location.getCurrentPositionAsync({});
            const locationData = { latitude: coords.latitude, longitude: coords.longitude };
            const clientId = uuidv4();
            const optimisticMessage = { id: clientId, client_id: clientId, created_at: new Date().toISOString(), sender_id: session.user.id, room_id: currentRoomId, location: locationData, status: 'sending', reactions: [] };
            setMessages(prev => [optimisticMessage, ...prev]);
            playSound(sentSoundRef);
            await sendMessage({ location: locationData, client_id: clientId });
        } catch (e) { Alert.alert(t('common.error'), t('chat.locationFetchError')); }
        finally { setIsSendingLocation(false); }
    }, [sendMessage, t, session, currentRoomId, playSound]);

    const handleEditMessage = useCallback(async () => { if (!editingMessage || !inputText.trim()) return; const newContent = inputText.trim(); const originalContent = editingMessage.content; setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: newContent } : msg)); setEditingMessage(null); setInputText(''); const { error } = await supabase.from('messages').update({ content: newContent }).eq('id', editingMessage.id); if (error) { Alert.alert(t('common.error'), error.message); setMessages(prev => prev.map(msg => msg.id === editingMessage.id ? { ...msg, content: originalContent } : msg)); } }, [editingMessage, inputText, t]);
    
    const handleReaction = useCallback(async (emoji, message) => {
        const target = message || selectedMessageForAction;
        if (!target) return;
        const { error: rpcError } = await supabase.rpc('toggle_reaction', { 
            p_message_id: target.id, 
            p_emoji: emoji 
        });
        if (rpcError) {
            Alert.alert(t('common.error'), rpcError.message);
            return;
        }
        const { data: updatedMessage, error: fetchError } = await supabase
            .from('messages')
            .select('*, reactions(*)')
            .eq('id', target.id)
            .single();
        if (fetchError) {
            console.error("Failed to fetch updated message after reaction:", fetchError);
            return;
        }
        if (updatedMessage) {
            setMessages(currentMessages =>
                currentMessages.map(m => (m.id === updatedMessage.id ? updatedMessage : m))
            );
        }
    }, [selectedMessageForAction, t]);

    const handleDeleteMessage = useCallback(() => {
        if (!selectedMessageForAction) return;
        Alert.alert(t('chat.deleteConfirmTitle'), t('chat.deleteConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                const messageIdToDelete = selectedMessageForAction.id;
                setMessages(prev => prev.filter(msg => msg.id !== messageIdToDelete));
                const { error } = await supabase.from('messages').delete().eq('id', messageIdToDelete);
                if (error) { Alert.alert(t('common.error'), error.message); }
            }}
        ]);
    }, [selectedMessageForAction, t]);

    const handleLongPress = useCallback((message) => { if (selectionMode) { if (message.sender_id === session?.user?.id) handleToggleSelection(message.id); } else { setSelectedMessageForAction(message); setActionSheetVisible(true); } }, [selectionMode, session]);
    const handleToggleSelection = useCallback((messageId) => { const newSelection = new Set(selectedMessages); if (newSelection.has(messageId)) newSelection.delete(messageId); else newSelection.add(messageId); if (newSelection.size === 0) setSelectionMode(false); setSelectedMessages(newSelection); }, [selectedMessages]);
    const handleCancelSelection = useCallback(() => { setSelectionMode(false); setSelectedMessages(new Set()); }, []);

    const handleDeleteSelected = useCallback(() => {
        Alert.alert( t('chat.deleteMultipleConfirmTitle'), t('chat.deleteMultipleConfirmBody', { count: selectedMessages.size }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                const idsToDelete = Array.from(selectedMessages);
                setMessages(prev => prev.filter(msg => !idsToDelete.includes(msg.id)));
                handleCancelSelection();
                await supabase.from('messages').delete().in('id', idsToDelete);
            }}
        ]);
    }, [selectedMessages, t, handleCancelSelection]);

    const pickImage = useCallback(async () => { 
        setAttachmentModalVisible(false); 
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync(); 
        if (status !== 'granted') { 
            Alert.alert(t('chat.permissionDeniedTitle'), t('chat.galleryPermissionDenied')); 
            return; 
        } 
        const result = await ImagePicker.launchImageLibraryAsync({ 
            quality: 0.8,
            allowsMultipleSelection: true
        }); 

        if (!result.canceled && result.assets) {
            for (const asset of result.assets) {
                await uploadAndSendImage(asset); 
            }
        } 
    }, [uploadAndSendImage, t]);

    const takePhoto = useCallback(async () => { 
        setAttachmentModalVisible(false); 
        const { status } = await ImagePicker.requestCameraPermissionsAsync(); 
        if (status !== 'granted') { 
            Alert.alert(t('chat.permissionDeniedTitle'), t('chat.cameraPermissionDenied')); 
            return; 
        } 
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 }); 
        if (!result.canceled) {
            uploadAndSendImage(result.assets[0]); 
        }
    }, [uploadAndSendImage, t]);

    const handleTyping = useCallback((text) => { setInputText(text); if (channelRef.current && channelRef.current.state === 'joined') { try { channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id } }); } catch (e) { console.error("Broadcast failed:", e); } } }, [session]);

    const lastMessage = useMemo(() => messages[0], [messages]); 
    const canLikeLastMessage = lastMessage && lastMessage.sender_id !== session?.user?.id && !inputText;


    // 💡 ЕТАП 1 РЕНДЕР: Повний екран завантаження, доки isRoomSetup === true
    if (!isRoomSetup) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle={colors.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }
    
    // 💡 ЕТАП 2 РЕНДЕР: Статичний UI (Header та Input) відображається
    return (
        <View style={styles.container}> 
            <StatusBar barStyle={colors.dark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <SafeAreaView style={{ flex: 0, backgroundColor: colors.card }} /> 
            <SafeAreaView style={{ flex: 1}}>

                {selectionMode ? ( <SelectionHeader selectionCount={selectedMessages.size} onCancel={handleCancelSelection} onDelete={handleDeleteSelected} colors={colors} /> ) : (
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
                        <View style={styles.headerUserInfo}>
                            <Text style={styles.headerUserName}>{recipientInfo.name}</Text>
                            {isRecipientTyping ? <TypingIndicator /> : <Text style={styles.headerUserStatus}>{userStatus}</Text>}
                        </View>
                            <TouchableOpacity 
                                onPress={() => {
                                if (recipientId) {
                                    navigation.navigate('PublicDriverProfile', {
                                        driverId: recipientId,
                                        driverName: recipientInfo.name
                                    });
                                }
                            }}
                        >
                        
                            <Image source={recipientInfo.avatar ? { uri: recipientInfo.avatar } : require('../assets/default-avatar.png')} style={styles.headerAvatar} cachePolicy="disk" />
                        </TouchableOpacity>                
                    </View>
                )}

                <KeyboardAvoidingView 
                    style={{ flex: 1, backgroundColor: 'colors.background' }} 
                    behavior={Platform.OS === "ios" ? "padding" : "height"} 
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
                >
                    
                    {isLoading ? (
                         <View style={[styles.flatList, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
                             <ActivityIndicator size="large" color={colors.primary} />
                             <Text style={{color: colors.secondaryText, marginTop: 10}}>{t('common.loadingMessages', 'Завантаження повідомлень...')}</Text>
                         </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={processedData}
                            inverted
                            renderItem={({ item }) => {
                                if (item.type === 'date_separator') return <DateSeparator date={item.date} />;
                                return <MessageBubble 
                                    message={item} 
                                    currentUserId={session?.user?.id} 
                                    onImagePress={setViewingImageUri} 
                                    onLongPress={handleLongPress} 
                                    onDoubleTap={m => handleReaction('👍', m)} 
                                    onSelect={handleToggleSelection} 
                                    selectionMode={selectionMode} 
                                    isSelected={selectedMessages.has(item.id)}
                                    isInitialLoad={false} // ВИМКНЕНО
                                />;
                            }}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}
                            style={{ flex: 1 }}
                            initialNumToRender={15} // Оптимізація
                            maxToRenderPerBatch={10} // Оптимізація
                            windowSize={21} // Оптимізація
                            removeClippedSubviews={true}
                        />
                    )}
                 
                    <View style={styles.inputContainer}>
                        <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}><Ionicons name="add" size={30} color={colors.secondaryText} /></TouchableOpacity>
                        <TextInput ref={textInputRef} style={styles.textInput} value={inputText} onChangeText={handleTyping} placeholder={t('chat.placeholder')} placeholderTextColor={colors.secondaryText} multiline blurOnSubmit={false} />
                        <TouchableOpacity style={styles.sendButton} onPress={handleSendText}><Ionicons name={editingMessage ? "checkmark" : "paper-plane"} size={24} color="#fff" /></TouchableOpacity>
                    </View>
   
                </KeyboardAvoidingView>
            
            <MessageActionSheet visible={isActionSheetVisible && !selectionMode} onClose={() => setActionSheetVisible(false)} message={selectedMessageForAction} isMyMessage={selectedMessageForAction?.sender_id === session?.user?.id} onCopy={() => Clipboard.setString(selectedMessageForAction?.content || '')} onEdit={() => { setEditingMessage(selectedMessageForAction); setInputText(selectedMessageForAction?.content || ''); textInputRef.current?.focus(); }} onDelete={handleDeleteMessage} onReact={(emoji) => handleReaction(emoji, selectedMessageForAction)} onSelect={() => { setSelectionMode(true); setSelectedMessages(new Set([selectedMessageForAction.id])); }} />
            
            <ImageViewerModal visible={!!viewingImageUri} uri={viewingImageUri} onClose={() => setViewingImageUri(null)} />
            <Modal animationType="slide" transparent={true} visible={isAttachmentModalVisible} onRequestClose={() => setAttachmentModalVisible(false)}>
                <Pressable style={styles.modalBackdropAttachments} onPress={() => setAttachmentModalVisible(false)}>
                    <View style={[styles.modalContent, { marginBottom: insets.bottom > 0 ? 0 : 20 }]}> 
                        <TouchableOpacity style={styles.modalButton} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.takePhoto')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImage}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.pickFromGallery')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={handleSendLocation}><Ionicons name="location-outline" size={24} color={colors.primary} /><Text style={styles.modalButtonText}>{t('chat.shareLocation')}</Text></TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
         </SafeAreaView>   {isSendingLocation && (<View style={styles.loadingOverlay}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.loadingText}>{t('chat.fetchingLocation')}</Text></View>)}
        </View> 
    );
}