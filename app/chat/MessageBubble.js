// MessageBubble.js (Статична версія)
import React, { memo, useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, TouchableOpacity, Platform, Alert, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AnimatePresence } from 'moti'; // Залишаємо AnimatePresence лише для SelectionCircle, але MotiView видалено
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import Hyperlink from 'react-native-hyperlink';
import MapView, { Marker } from 'react-native-maps';

// ДОПОМІЖНИЙ КОМПОНЕНТ: Коло виділення (Спрощуємо, прибираючи MotiView, якщо не критично)
const SelectionCircle = memo(({ isSelected, colors, styles }) => {
    // 💡 ЗМІНА: Видаляємо MotiView, залишаємо лише стани через View/Ionicons
    const color = isSelected ? colors.primary : styles.selectionCircleEmpty.borderColor;
    const icon = isSelected ? "checkmark-circle" : "ellipse-outline"; // Використовуємо іншу іконку для "порожнього"
    const size = 26;
    
    return (
        <View style={styles.selectionCircleContainer}>
            {isSelected ? (
                <Ionicons name={icon} size={size} color={color} />
            ) : (
                <View style={styles.selectionCircleEmpty} />
            )}
        </View>
    );
});


// ДОПОМІЖНИЙ КОМПОНЕНТ: Ізолюємо медіа контент
const MessageMediaContent = memo(({ message, onImagePress, isMyMessage, styles, t, UploadingIndicator }) => {
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isImageCached, setIsImageCached] = useState(false);
    // ... (Логіка рендеру медіа без змін)
    
    if (message.image_url) {
        return (
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
        );
    }
    
    if (message.location) {
        const handleOpenMap = () => { 
            const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' }); 
            const latLng = `${message.location.latitude},${message.location.longitude}`; 
            const label = t('chat.locationLabel'); 
            const url = Platform.select({ ios: `${scheme}${label}@${latLng}`, android: `${scheme}${latLng}(${label})` }); 
            Linking.openURL(url); 
        };
        
        return (
            <TouchableOpacity onPress={handleOpenMap}>
                <MapView 
                    style={styles.messageMap} 
                    initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }} 
                    scrollEnabled={false} 
                    zoomEnabled={false}
                >
                    <Marker coordinate={message.location} />
                </MapView>
            </TouchableOpacity>
        );
    }

    return null;
});


const MessageBubble = memo(({ message, currentUserId, onImagePress, onLongPress, onDoubleTap, onSelect, selectionMode, isSelected, styles, colors }) => {
    const { t } = useTranslation(); 
    const isMyMessage = message.sender_id === currentUserId; 
    const lastTap = useRef(0);
    
    const handlePress = () => { 
        if (selectionMode) { 
            if (isMyMessage) onSelect(message.id); 
            return; 
        } 
        const now = Date.now(); 
        const DOUBLE_PRESS_DELAY = 300; 
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) { 
            if (!isMyMessage) onDoubleTap(message); 
        } 
        lastTap.current = now; 
    };

    const UploadingIndicator = () => (<View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="#FFFFFF" /></View>);
    
    // 💡 КРИТИЧНА ЗМІНА: Використовуємо простий View, MotiView повністю видалено
    return (
        <Pressable 
            onLongPress={() => onLongPress(message)} 
            onPress={handlePress} 
            style={styles.messageContainer}
        >
            <View>
                <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                    {selectionMode && isMyMessage && <SelectionCircle isSelected={isSelected} colors={colors} styles={styles} />}
                    <View style={{ maxWidth: selectionMode ? '70%' : '80%' }}>
                        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image_url || message.location) && { padding: 4 }]}>
                            
                            {message.content && (<Hyperlink linkDefault={true} linkStyle={{ color: isMyMessage ? '#9ECAE8' : '#2980b9' }}><Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.content}</Text></Hyperlink>)}
                            
                            <MessageMediaContent 
                                message={message} 
                                onImagePress={onImagePress} 
                                isMyMessage={isMyMessage} 
                                styles={styles} 
                                t={t} 
                                UploadingIndicator={UploadingIndicator}
                            />

                            <View style={[styles.messageInfo, (message.image_url || message.location) && styles.messageInfoOverlay]}>
                                <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{moment(message.created_at).format('HH:mm')}</Text>
                                {isMyMessage && <Ionicons name={message.status === 'sending' || message.status === 'uploading' ? "time-outline" : (message.status === 'read' ? "checkmark-done" : "checkmark")} size={16} color={message.status === 'read' ? "#4FC3F7" : "#FFFFFF90"} />}
                            </View>
                        </View>
                        {message.reactions && message.reactions.length > 0 && (<View style={[styles.reactionsContainer, { alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}>{message.reactions.map(r => ( <View key={r.emoji} style={styles.reactionBadge}><Text style={styles.reactionBadgeText}>{r.emoji} {r.count}</Text></View> ))}</View>)}
                    </View>
                </View>
            </View>
        </Pressable>
    );
}, (prevProps, nextProps) => {
    // 💡 ПЕРЕВІРКА ПРОПСІВ: Залишається незмінною
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.status === nextProps.message.status &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.selectionMode === nextProps.selectionMode &&
        prevProps.message.reactions?.length === nextProps.message.reactions?.length
    );
});

export default MessageBubble;