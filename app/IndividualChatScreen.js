import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, SafeAreaView, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Pressable, StatusBar, Text, AppState, InteractionManager } from 'react-native';
import { useUnreadCount } from '../provider/Unread Count Context';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
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
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import ImageViewing from 'react-native-image-viewing';
import { MotiView } from 'moti'; 

import { getStyles } from './components/ChatStyles';
import MessageBubble from './components/MessageBubble'; 
import ChatInput from './components/ChatInput';
import PinnedMessageBar from './components/PinnedMessageBar';
import ChatHeaderStatus from './ChatHeaderStatus';

const PAGE_SIZE = 25;

const DateHeader = ({ date, t, colors }) => {
    let dateText = '';
    const messageDate = moment(date);
    const today = moment();
    const yesterday = moment().subtract(1, 'days');

    if (messageDate.isSame(today, 'day')) {
        dateText = t('chat.today', 'Сьогодні');
    } else if (messageDate.isSame(yesterday, 'day')) {
        dateText = t('chat.yesterday', 'Вчора');
    } else {
        dateText = messageDate.format('D MMMM YYYY');
    }

    return (
        <View style={{ alignItems: 'center', marginVertical: 12, marginBottom: 8 }}>
            <View style={{ backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, color: colors.secondaryText, fontWeight: '500' }}>{dateText}</Text>
            </View>
        </View>
    );
};

const ImageViewerModal = React.memo(({ visible, uri, onClose, colors, t }) => {
    if (!uri) return null;
    return (
        <ImageViewing 
            images={[{ uri }]} 
            imageIndex={0} 
            visible={visible} 
            onRequestClose={onClose} 
            animationType="fade" 
        />
    );
});

const MessageActionSheet = React.memo(({ visible, onClose, message, isMyMessage, onCopy, onEdit, onDelete, onReact, onSelect, onPin, onReply, colors, t }) => {
    const styles = useMemo(() => getStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    if (!message) return null;
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.actionSheetBackdrop} onPress={onClose}>
                <MotiView from={{ translateY: 300 }} animate={{ translateY: 0 }} transition={{ type: 'spring', damping: 18 }} style={[styles.actionSheetContainer, { marginBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                    <View style={styles.reactionPickerContainer}>
                        {reactions.map((emoji, index) => (
                            <MotiView key={emoji} from={{ scale: 0 }} animate={{ scale: 1 }} delay={index * 50}>
                                <TouchableOpacity onPress={() => { onReact(emoji); onClose(); }} style={styles.reactionEmojiButton}><Text style={styles.reactionEmojiText}>{emoji}</Text></TouchableOpacity>
                            </MotiView>
                        ))}
                    </View>
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onReply(); onClose(); }}><Ionicons name="arrow-undo-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.reply', 'Відповісти')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => { onPin(); onClose(); }}><Ionicons name="pin-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.pin', 'Закріпити')}</Text></TouchableOpacity>
                        {isMyMessage && (<TouchableOpacity style={styles.actionButton} onPress={() => { onSelect(); onClose(); }}><Ionicons name="checkmark-circle-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.select', 'Вибрати')}</Text></TouchableOpacity>)}
                        {message.content && (<TouchableOpacity style={styles.actionButton} onPress={() => { onCopy(); onClose(); }}><Ionicons name="copy-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.copy', 'Копіювати')}</Text></TouchableOpacity>)}
                        {isMyMessage && message.content && (<TouchableOpacity style={styles.actionButton} onPress={() => { onEdit(); onClose(); }}><Ionicons name="create-outline" size={22} color={colors.text} /><Text style={styles.actionButtonText}>{t('chat.edit', 'Редагувати')}</Text></TouchableOpacity>)}
                        {isMyMessage && (<TouchableOpacity style={[styles.actionButton, { borderBottomWidth: 0 }]} onPress={() => { onDelete(); onClose(); }}><Ionicons name="trash-outline" size={22} color={'#D83C3C'} /><Text style={[styles.actionButtonText, { color: '#D83C3C' }]}>{t('common.delete', 'Видалити')}</Text></TouchableOpacity>)}
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}><Text style={styles.cancelButtonText}>{t('common.cancel', 'Скасувати')}</Text></TouchableOpacity>
                </MotiView>
            </Pressable>
        </Modal>
    );
});

export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => getStyles(colors), [colors]);
    const { t, i18n } = useTranslation();
    const route = useRoute();
    const navigation = useNavigation();
    const { session, profile } = useAuth();
    const { fetchUnreadCount } = useUnreadCount();
    
    const [recipientInfo, setRecipientInfo] = useState({ 
        name: route.params?.recipientName || route.params?.driverName || t('common.user', 'Користувач'), 
        avatar: route.params?.recipientAvatar || null 
    });
    
    const [messages, setMessages] = useState([]);
    const [currentRoomId, setCurrentRoomId] = useState(route.params?.roomId || null);
    
    const [isScreenReady, setIsScreenReady] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);

    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [isRecipientTyping, setIsRecipientTyping] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [selectedMessageForAction, setSelectedMessageForAction] = useState(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [isSendingLocation, setIsSendingLocation] = useState(false);

    const [lastSeen, setLastSeen] = useState(route.params?.recipientLastSeen || null);

    const flatListRef = useRef(null);
    const channelRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const sentSoundRef = useRef(new Audio.Sound());
    const receivedSoundRef = useRef(new Audio.Sound());

    const { recipientId } = route.params || {};
    
    const scrollToBottom = (animated = true) => {
        if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: animated });
        }
    };

    useLayoutEffect(() => {
        if (selectionMode) {
            navigation.setOptions({
                headerShown: true,
                headerTitle: String(selectedMessages.size),
                headerTitleAlign: 'left',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedMessages(new Set()); }} style={{ marginLeft: 10 }}>
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={handleDeleteSelected} style={{ marginRight: 10 }}>
                        <Ionicons name="trash-outline" size={26} color={colors.text} />
                    </TouchableOpacity>
                ),
                headerStyle: { backgroundColor: colors.card },
                headerShadowVisible: false,
            });
        } else {
            navigation.setOptions({
                headerShown: true,
                title: '',
                headerTitleAlign: 'center',
                headerStyle: { backgroundColor: colors.card },
                headerShadowVisible: false,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                        <Ionicons name="chevron-back" size={28} color={colors.primary} />
                    </TouchableOpacity>
                ),
                headerTitle: () => (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.text }}>
                            {recipientInfo.name}
                        </Text>
                        <ChatHeaderStatus 
                            recipientId={recipientId || route.params?.driverId} 
                            initialLastSeen={lastSeen} 
                            isTyping={isRecipientTyping}
                        />
                    </View>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={() => (recipientId || route.params?.driverId) && navigation.navigate('PublicDriverProfile', { driverId: recipientId || route.params?.driverId, driverName: recipientInfo.name })} style={{ marginRight: 10 }}>
                        <Image source={recipientInfo.avatar ? { uri: recipientInfo.avatar } : require('../assets/default-avatar.png')} style={{ width: 35, height: 35, borderRadius: 17.5 }} contentFit="cover"/>
                    </TouchableOpacity>
                )
            });
        }
    }, [navigation, recipientId, lastSeen, colors, selectionMode, selectedMessages.size, recipientInfo, handleDeleteSelected, isRecipientTyping]);

    useEffect(() => {
        if (i18n?.language) moment.locale(i18n.language);
        const loadSounds = async () => { try { await sentSoundRef.current.loadAsync(require('../assets/sound/send_massege.mp3')); await receivedSoundRef.current.loadAsync(require('../assets/sound/get_massege.mp3')); } catch (e) {} };
        loadSounds();
        return () => { sentSoundRef.current.unloadAsync(); receivedSoundRef.current.unloadAsync(); };
    }, [i18n?.language]);

    const playSound = useCallback(async (ref) => { try { await ref.current.replayAsync(); } catch (e) {} }, []);

    useEffect(() => {
        let isMounted = true;
        const initChat = async () => {
            try {
                const rId = route.params?.recipientId || route.params?.driverId;
                let activeRoomId = route.params?.roomId;

                if (!activeRoomId && rId) {
                    const { data } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: rId });
                    if (data) activeRoomId = data;
                }

                if (activeRoomId && isMounted) {
                    setCurrentRoomId(activeRoomId);
                    await fetchMessages(activeRoomId, 0); 
                    subscribeToChat(activeRoomId);
                }
            } catch (e) { 
                console.log("Chat init error:", e);
            } finally { 
                if (isMounted) {
                    setInitialLoading(false);
                    setIsScreenReady(true);
                }
            }
        };

        const task = InteractionManager.runAfterInteractions(() => {
            if (session?.user) initChat();
        });

        return () => { 
            isMounted = false; 
            task.cancel();
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            fetchUnreadCount();
        };
    }, [route.params, session]);

    const markMessagesAsRead = useCallback(async () => {
        if (!currentRoomId || !session?.user?.id) return;
        try {
            await supabase.from('messages').update({ status: 'read' }).eq('room_id', currentRoomId).neq('sender_id', session.user.id).neq('status', 'read');
            fetchUnreadCount();
        } catch (error) {}
    }, [currentRoomId, session?.user?.id, fetchUnreadCount]);

    useEffect(() => {
        if (!currentRoomId) return;
        markMessagesAsRead();
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') { 
                markMessagesAsRead(); 
                fetchMessages(currentRoomId, 0);
            }
        });
        return () => subscription.remove();
    }, [currentRoomId, markMessagesAsRead]);

    const subscribeToChat = (roomId) => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const recipientId = route.params?.recipientId || route.params?.driverId;

        const ch = supabase.channel(`room-${roomId}`, { config: { presence: { key: session.user.id } } });
        channelRef.current = ch;
        
        ch
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (pl) => {
            if (pl.new.sender_id === session.user.id) {
                setMessages(prev => prev.map(m => (m.client_id === pl.new.client_id ? pl.new : m)));
            } else {
                setMessages(p => {
                    if (p.some(m => m.id === pl.new.id)) return p;
                    return [pl.new, ...p];
                });
                playSound(receivedSoundRef); 
                markMessagesAsRead();
            }
            setTimeout(() => scrollToBottom(true), 200);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (pl) => {
             setMessages(p => p.map(m => m.id === pl.new.id ? { ...m, ...pl.new } : m));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (pl) => {
            setMessages(prev => prev.filter(m => m.id !== pl.old.id));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${roomId}` }, (pl) => {
             if (pl.new.pinned_messages) fetchPinnedMessages(roomId);
        })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
            if (payload.user_id !== session.user.id) {
                setIsRecipientTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsRecipientTyping(false), 2000);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await ch.track({ user_id: session.user.id, online_at: new Date().toISOString() });
            }
        });
    };

    const fetchPinnedMessages = useCallback(async (roomId) => {
        const { data: roomData } = await supabase.from('chat_rooms').select('pinned_messages').eq('id', roomId).single();
        if (roomData?.pinned_messages?.length > 0) {
            const { data: msgs } = await supabase.from('messages').select('*').in('id', roomData.pinned_messages);
            setPinnedMessages(msgs || []);
        } else { setPinnedMessages([]); }
    }, []);

    const fetchMessages = useCallback(async (roomId, offset = 0) => {
        if (offset === 0) { setAllMessagesLoaded(false); fetchPinnedMessages(roomId); } 
        else { if (allMessagesLoaded) return; setIsLoadingMore(true); }

        const { data, error } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
        if (!error) {
            if (data.length < PAGE_SIZE) setAllMessagesLoaded(true);
            if (offset === 0) { setMessages(data || []); markMessagesAsRead(); } 
            else { setMessages(prev => [...prev, ...data]); }
        }
        setIsLoadingMore(false);
    }, [allMessagesLoaded, fetchPinnedMessages, markMessagesAsRead]);

    const handleLoadMore = () => {
        if (!isLoadingMore && !allMessagesLoaded && !initialLoading && messages.length >= PAGE_SIZE) {
            fetchMessages(currentRoomId, messages.length);
        }
    };

    const handleSendText = useCallback(async (text) => {
        if (editingMessage) {
            const { error } = await supabase.from('messages').update({ content: text }).eq('id', editingMessage.id);
            if (!error) { setMessages(p => p.map(m => m.id === editingMessage.id ? { ...m, content: text } : m)); setEditingMessage(null); }
            return;
        }
        const cid = uuidv4();
        
        const optimisticMsg = { 
            id: cid,
            client_id: cid, 
            created_at: new Date().toISOString(), 
            sender_id: session.user.id, 
            room_id: currentRoomId, 
            content: text, 
            status: 'sending', 
            reactions: [], 
            reply_to_message_id: replyToMessage?.id || null, 
            is_read: false 
        };
        
        setMessages(p => [optimisticMsg, ...p]); 
        playSound(sentSoundRef);
        setReplyToMessage(null);
        scrollToBottom(true);

        const payload = { content: text, room_id: currentRoomId, sender_id: session.user.id, client_id: cid };
        if (replyToMessage) payload.reply_to_message_id = replyToMessage.id;

        const { data, error } = await supabase.from('messages').insert([payload]).select().single();
        if (!error) {
            setMessages(p => p.map(m => m.client_id === cid ? data : m));
            
            const recipientId = route.params?.recipientId || route.params?.driverId;
            if (recipientId) {
                supabase.functions.invoke('send-push-notification', { 
                    body: { 
                        recipient_id: recipientId, 
                        message_content: text, 
                        sender_name: profile?.full_name,
                        room_id: currentRoomId,      
                        sender_id: session.user.id   
                    } 
                }).catch((err) => console.log("Push error:", err));
            }

        } else {
            setMessages(p => p.filter(m => m.client_id !== cid)); Alert.alert(t('common.error'), t('chat.sendError'));
        }
    }, [currentRoomId, session, replyToMessage, editingMessage, route.params, profile, t, playSound]);

    const uploadFile = async (asset, type) => {
        setAttachmentModalVisible(false);
        const cid = uuidv4();
        
        const msg = { 
            id: cid,
            client_id: cid, 
            room_id: currentRoomId, 
            sender_id: session.user.id, 
            created_at: new Date().toISOString(), 
            status: 'uploading', 
            reactions: [],
            is_read: false
        };
        
        if (type === 'image') msg.image_url = asset.uri; 
        else msg.location = asset;
        
        setMessages(p => [msg, ...p]); 
        playSound(sentSoundRef);
        scrollToBottom(true);

        try {
            let dbPayload = { room_id: currentRoomId, sender_id: session.user.id, client_id: cid };
            
            if (type === 'image') {
                const ext = asset.uri.split('.').pop(); 
                const path = `${session.user.id}/${Date.now()}.${ext}`;
                const fd = new FormData(); 
                fd.append('file', { uri: asset.uri, name: path, type: `image/${ext}` });
                
                const { error: upErr } = await supabase.storage.from('chat_images').upload(path, fd);
                if (upErr) throw upErr;
                
                const { data: urlData } = supabase.storage.from('chat_images').getPublicUrl(path);
                dbPayload.image_url = urlData.publicUrl; 
                dbPayload.blurhash = asset.blurhash;
            } else { 
                dbPayload.location = asset; 
            }
            
            const { data, error } = await supabase.from('messages').insert([dbPayload]).select().single();
            if (error) throw error;
            
            setMessages(p => p.map(m => m.client_id === cid ? data : m));
            
            const recipientId = route.params?.recipientId || route.params?.driverId;
            if (recipientId) {
                const notificationText = type === 'image' ? '📷 Фото' : '📍 Геолокація';
                supabase.functions.invoke('send-push-notification', { 
                    body: { 
                        recipient_id: recipientId, 
                        message_content: notificationText, 
                        sender_name: profile?.full_name,
                        room_id: currentRoomId,
                        sender_id: session.user.id
                    } 
                }).catch(() => {});
            }

        } catch (e) { 
            setMessages(p => p.filter(m => m.client_id !== cid)); 
            Alert.alert(t('common.error'), e.message); 
        }
    };

    const pickImage = async () => {
        try {
            const r = await ImagePicker.launchImageLibraryAsync({ 
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7, 
                allowsEditing: false 
            });
            
            if (!r.canceled && r.assets && r.assets.length > 0) {
                uploadFile(r.assets[0], 'image');
            }
        } catch (e) {
            console.log("Error picking image:", e);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if(status!=='granted') return Alert.alert(t('chat.permissionDeniedTitle'));
        const r = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if(!r.canceled && r.assets && r.assets.length > 0) uploadFile(r.assets[0], 'image');
    };

    const sendLoc = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return Alert.alert(t('chat.permissionDeniedTitle'));
            setIsSendingLocation(true);
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            if (location && location.coords) uploadFile({ latitude: location.coords.latitude, longitude: location.coords.longitude }, 'loc');
        } catch (e) { Alert.alert(t('common.error'), e.message); } 
        finally { setIsSendingLocation(false); }
    };

    const handleReaction = useCallback(async (emoji, msg) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const target = msg || selectedMessageForAction; if(!target) return;
        const uid = session?.user?.id;
        setMessages(p => p.map(m => {
            if(m.id !== target.id) return m;
            let currentReactions = m.reactions || [];
            if (!Array.isArray(currentReactions)) currentReactions = [];
            const existingIndex = currentReactions.findIndex(r => r.emoji === emoji && r.user_id === uid);
            let newReactions = [...currentReactions];
            if (existingIndex > -1) newReactions.splice(existingIndex, 1);
            else newReactions.push({ emoji, user_id: uid, created_at: new Date().toISOString() });
            return { ...m, reactions: newReactions };
        }));
        await supabase.rpc('toggle_reaction', { p_message_id: target.id, p_emoji: emoji });
    }, [selectedMessageForAction, session]);

    const handlePinMessage = async () => {
        if (!selectedMessageForAction || !currentRoomId) return;
        try {
            const currentPins = pinnedMessages.map(m => m.id);
            if (!currentPins.includes(selectedMessageForAction.id)) {
                const newPins = [...currentPins, selectedMessageForAction.id];
                await supabase.from('chat_rooms').update({ pinned_messages: newPins }).eq('id', currentRoomId);
            }
        } catch (e) {}
    };
    
    const handleUnpinMessage = async (msgId) => {
        try {
            const newPins = pinnedMessages.filter(m => m.id !== msgId).map(m => m.id);
            await supabase.from('chat_rooms').update({ pinned_messages: newPins }).eq('id', currentRoomId);
        } catch (e) {}
    };

    const handleDeleteMessage = useCallback(() => {
        if (!selectedMessageForAction) return;
        Alert.alert(t('chat.deleteConfirmTitle'), t('chat.deleteConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                const mid = selectedMessageForAction.id;
                setMessages(prev => prev.filter(m => m.id !== mid)); setActionSheetVisible(false);
                await supabase.from('messages').delete().eq('id', mid);
            }}
        ]);
    }, [selectedMessageForAction, t]);

    const handleDeleteSelected = useCallback(() => {
        Alert.alert(t('chat.deleteMultipleConfirmTitle'), t('chat.deleteMultipleConfirmBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: async () => {
                const ids = Array.from(selectedMessages);
                setMessages(p => p.filter(m => !ids.includes(m.id))); setSelectionMode(false); setSelectedMessages(new Set());
                await supabase.from('messages').delete().in('id', ids);
            }}
        ]);
    }, [selectedMessages, t]);

    const handleToggleSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const newSet = new Set(prev); if (newSet.has(messageId)) newSet.delete(messageId); else newSet.add(messageId);
            if (newSet.size === 0) setSelectionMode(false);
            return newSet;
        });
    }, []);

    const handleScrollToMessage = useCallback((message) => {
        if (!message || !message.id) return;
        const index = messages.findIndex(m => m.id === message.id);
        if (index !== -1 && flatListRef.current) {
            try {
                flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
                setHighlightedMessageId(message.id); setTimeout(() => setHighlightedMessageId(null), 2000);
            } catch (e) {}
        } else {
            Alert.alert(t('common.notice'), t('chat.messageNotLoaded', 'Це повідомлення занадто старе, завантажте історію вище.'));
        }
    }, [messages, t]);

    const onScrollToIndexFailed = (info) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => { if (flatListRef.current) flatListRef.current.scrollToIndex({ index: info.index, animated: true }); });
    };
    
    const handleTyping = useCallback(() => channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: session.user.id } }), [session]);

    const renderItem = useCallback(({ item, index }) => {
        const nextItem = messages[index + 1];

        const isNewDay = !nextItem || !moment(item.created_at).isSame(nextItem.created_at, 'day');

        return (
            <View>
=                {isNewDay && <DateHeader date={item.created_at} t={t} colors={colors} />}
                
                <MessageBubble 
                    message={item} 
                    isMyMessage={item.sender_id === session?.user?.id}
                    currentUserId={session?.user?.id}
                    onLongPress={(m) => { if(selectionMode) { if(m.sender_id === session.user.id) handleToggleSelection(m.id); } else { setSelectedMessageForAction(m); setActionSheetVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } }}
                    onDoubleTap={(emoji, m) => handleReaction(emoji, m)} 
                    onImagePress={setViewingImageUri} 
                    onSelect={handleToggleSelection} 
                    selectionMode={selectionMode} 
                    isSelected={selectedMessages.has(item.id)}
                    highlighted={item.id === highlightedMessageId}
                    colors={colors}
                    replyMessage={item.reply_to_message_id ? messages.find(m => m.id === item.reply_to_message_id) : null}
                    onReplyPress={(m) => handleScrollToMessage(m)}
                />
            </View>
        );
    }, [selectionMode, colors, session, highlightedMessageId, handleReaction, handleToggleSelection, messages, selectedMessages, t]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle={colors.theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
            <SafeAreaView style={{ flex: 0, backgroundColor: colors.card }} />
            <SafeAreaView style={{ flex: 1 }}>
                
                {pinnedMessages.length > 0 && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                        <PinnedMessageBar messages={pinnedMessages} onPress={handleScrollToMessage} onUnpin={handleUnpinMessage} colors={colors} />
                    </View>
                )}

                {!isScreenReady ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={item => item.id.toString()}
                        inverted
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        contentContainerStyle={[
                            styles.flatListContent, 
                            { paddingBottom: pinnedMessages.length > 0 ? 60 : 10 }
                        ]}
                        ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                        initialNumToRender={15} 
                        maxToRenderPerBatch={10}
                        windowSize={10} 
                        removeClippedSubviews={true}
                        extraData={messages} // Важливо для оновлення дат
                        maintainVisibleContentPosition={null} 
                        onScrollToIndexFailed={onScrollToIndexFailed}
                    />
                )}

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
                    <ChatInput
                        onSendText={handleSendText}
                        onAttachmentPress={() => setAttachmentModalVisible(true)}
                        onTyping={handleTyping}
                        isEditing={editingMessage}
                        replyTo={replyToMessage}
                        onCancelReply={() => setReplyToMessage(null)}
                        colors={colors}
                        t={t}
                    />
                </KeyboardAvoidingView>
            </SafeAreaView>

            <Modal transparent={true} visible={isAttachmentModalVisible} animationType="slide" onRequestClose={() => setAttachmentModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAttachmentModalVisible(false)}>
                    <View style={styles.attachmentContainer}>
                        <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}><Ionicons name="image-outline" size={24} color={colors.primary} /><Text style={styles.attachmentText}>{t('chat.gallery', 'Галерея')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentOption} onPress={takePhoto}><Ionicons name="camera-outline" size={24} color={colors.primary} /><Text style={styles.attachmentText}>{t('chat.camera', 'Камера')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentOption} onPress={sendLoc}>
                             {isSendingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="location-outline" size={24} color={colors.primary} />}
                             <Text style={styles.attachmentText}>{t('chat.location', 'Геолокація')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentCancel} onPress={() => setAttachmentModalVisible(false)}><Text style={{ color: colors.text, fontSize: 17, fontWeight: 'bold' }}>{t('common.cancel', 'Скасувати')}</Text></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ImageViewerModal visible={!!viewingImageUri} uri={viewingImageUri} onClose={() => setViewingImageUri(null)} colors={colors} t={t} />

            <MessageActionSheet 
                visible={isActionSheetVisible} 
                onClose={() => setActionSheetVisible(false)} 
                message={selectedMessageForAction} 
                isMyMessage={selectedMessageForAction?.sender_id === session?.user?.id}
                onCopy={async () => { await Clipboard.setStringAsync(selectedMessageForAction.content); }}
                onEdit={() => setEditingMessage(selectedMessageForAction)}
                onDelete={handleDeleteMessage}
                onReact={(emoji) => handleReaction(emoji, selectedMessageForAction)}
                onSelect={() => { setSelectionMode(true); setSelectedMessages(new Set([selectedMessageForAction.id])); }}
                onPin={handlePinMessage}
                onReply={() => setReplyToMessage(selectedMessageForAction)}
                colors={colors}
                t={t}
            />
        </View>
    );
}