import React, { memo, useMemo, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Pressable, Animated, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import moment from 'moment';
import { MotiView, AnimatePresence } from 'moti';
import { getStyles } from './ChatStyles';
import Hyperlink from 'react-native-hyperlink';
import { LinkPreview } from '@flyerhq/react-native-link-preview';
import * as Haptics from 'expo-haptics';

const arePropsEqual = (prev, next) => {
    return (
        prev.message.id === next.message.id &&
        prev.message.status === next.message.status &&
        prev.message.is_read === next.message.is_read &&
        prev.isSelected === next.isSelected && 
        prev.selectionMode === next.selectionMode &&
        prev.highlighted === next.highlighted &&
        prev.replyMessage?.id === next.replyMessage?.id &&
        JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions)
    );
};

const MessageBubble = ({ message, currentUserId, onImagePress, onLongPress, onSelect, onDoubleTap, selectionMode, isSelected, colors, highlighted, replyMessage, onReplyPress }) => {
    const styles = useMemo(() => getStyles(colors), [colors]);
    const isMyMessage = message.sender_id === currentUserId;
    const [isImageLoading, setIsImageLoading] = useState(false);
    
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const lastTap = useRef(0);
    
    const baseColor = isMyMessage ? '#0c81bfff' : colors.card;
    const highlightBgColor = isMyMessage ? '#041241ff' : '#6853b9ff';

    const aggregatedReactions = useMemo(() => {
        const rawReactions = message.reactions || []; 
        if (!Array.isArray(rawReactions) || rawReactions.length === 0) return [];
        const counts = rawReactions.reduce((acc, r) => {
            if (r?.emoji) acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([emoji, count]) => ({ 
            emoji, count, isMine: rawReactions.some(r => r.emoji === emoji && r.user_id === currentUserId)
        }));
    }, [message.reactions, currentUserId]);

    const handlePress = () => { 
        if (selectionMode) {
            onSelect(message.id);
            if (Platform.OS === 'ios') Haptics.selectionAsync();
            return;
        }

        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300; 
        
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1.1, friction: 3, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true })
            ]).start();

            if (onDoubleTap) onDoubleTap('❤️', message);
            lastTap.current = 0; 
        } else {
            lastTap.current = now;
        }
    };
    
    const openMap = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${message.location.latitude},${message.location.longitude}`;
        Linking.openURL(`${scheme}${latLng}`);
    };

    const renderReplyPreview = () => {
        if (!message.reply_to_message_id) return null;

        const borderColor = isMyMessage ? 'rgba(255,255,255,0.6)' : colors.primary;
        const textColor = isMyMessage ? '#FFFFFF' : colors.text;
        const subTextColor = isMyMessage ? 'rgba(255,255,255,0.8)' : colors.secondaryText;

        let previewText = 'Повідомлення недоступне';
        let previewName = 'Користувач';

        if (replyMessage) {
            if (replyMessage.content) previewText = replyMessage.content;
            else if (replyMessage.image_url) previewText = '📷 Фото';
            else if (replyMessage.location) previewText = '📍 Геолокація';
            
            previewName = replyMessage.sender_id === currentUserId ? 'Ви' : (replyMessage.sender_name || 'У відповідь');
        } else {
            previewText = 'Завантаження...';
        }

        return (
            <TouchableOpacity 
                onPress={() => replyMessage && onReplyPress && onReplyPress(replyMessage)}
                activeOpacity={0.8}
                style={[styles.replyContainerBubble, { borderLeftColor: borderColor }]}
            >
                <Text style={[styles.replyTitle, { color: textColor }]}>{previewName}</Text>
                <Text style={[styles.replyText, { color: subTextColor }]} numberOfLines={1}>
                    {previewText}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderTextContent = () => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasUrl = message.content && message.content.match(urlRegex);
        const textStyle = [styles.messageText, isMyMessage ? styles.myMessageText : styles.theirMessageText];

        if (hasUrl) {
            return (
                <View>
                     <Text style={textStyle}>{message.content}</Text>
                     <View style={{ marginTop: 5 }}>
                        <LinkPreview 
                            text={message.content} 
                            containerStyle={styles.linkPreviewContainer}
                            metadataContainerStyle={styles.linkPreviewTextContainer}
                            renderImage={(data) => {
                                 if(!data?.url) return null;
                                 return <Image source={{uri: data.url}} style={styles.linkPreviewImage} contentFit="cover" cachePolicy="memory-disk"/>
                            }}
                            renderTitle={(title) => <Text numberOfLines={1} style={[styles.linkPreviewTitle, !isMyMessage && { color: colors.text }]}>{title}</Text>}
                            renderDescription={(desc) => <Text numberOfLines={2} style={[styles.linkPreviewDesc, !isMyMessage && { color: colors.secondaryText }]}>{desc}</Text>}
                         />
                     </View>
                </View>
            );
        }

        return (
            <Hyperlink linkDefault={true} linkStyle={{ color: isMyMessage ? '#fff' : colors.primary, textDecorationLine: 'underline' }}>
                <Text style={textStyle}>{message.content}</Text>
            </Hyperlink>
        );
    };

    const isMedia = message.image_url || message.location;

    return (
        <Pressable
            onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onLongPress(message);
            }}
            onPress={handlePress}
            onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
            style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer]}
            delayLongPress={250}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }], maxWidth: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                    
                    {selectionMode && !isMyMessage && (
                        <View style={{ justifyContent: 'center', marginRight: 8 }}>
                            <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={22} color={isSelected ? colors.primary : colors.secondaryText} />
                        </View>
                    )}
                    
                    {/* ОБГОРТКА ПОВІДОМЛЕННЯ + РЕАКЦІЙ */}
                    <View style={{ 
                        maxWidth: selectionMode ? '85%' : '100%',
                        // Додаємо відступ знизу, якщо є реакції, щоб бабл не наїжджав на інші повідомлення
                        paddingBottom: aggregatedReactions.length > 0 ? 12 : 0 
                    }}>
                        <MotiView 
                            animate={{ backgroundColor: highlighted ? highlightBgColor : baseColor, scale: highlighted ? 1.05 : 1 }}
                            transition={{ type: 'timing', duration: 300 }}
                            style={[
                                styles.bubble, 
                                isMyMessage ? styles.myBubble : styles.theirBubble,
                                { backgroundColor: undefined },
                                isMedia && { padding: 4 }
                            ]}
                        >
                            {renderReplyPreview()}
                            {message.content && renderTextContent()}

                            {message.image_url && (
                                <TouchableOpacity onPress={() => onImagePress(message.image_url)} activeOpacity={0.95}>
                                    <Image
                                        source={{ uri: message.image_url }}
                                        style={styles.messageImage}
                                        contentFit="cover"
                                        transition={200}
                                        cachePolicy="memory-disk"
                                        placeholder={message.blurhash}
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                    />
                                    {isImageLoading && <View style={styles.imageLoadingOverlay}><ActivityIndicator color="#fff" /></View>}
                                </TouchableOpacity>
                            )}

                            {message.location && (
                                <TouchableOpacity onPress={openMap}>
                                    <MapView
                                        style={styles.messageMap}
                                        initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                                        scrollEnabled={false} zoomEnabled={false} liteMode={true} pointerEvents="none"
                                    >
                                        <Marker coordinate={message.location} />
                                    </MapView>
                                </TouchableOpacity>
                            )}
                            
                            {/* ФУТЕР залишається всередині, щоб час красиво накладався на картинку */}
                            <View style={[styles.messageFooter, isMedia && styles.messageInfoOverlay]}>
                                <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.theirMessageTime]}>
                                    {moment(message.created_at).format('HH:mm')}
                                </Text>
                                {isMyMessage && (
                                    <Ionicons 
                                        name={message.is_read || message.status === 'read' ? "checkmark-done" : "checkmark"} 
                                        size={14} 
                                        color={message.is_read || message.status === 'read' ? "#fff" : "rgba(255,255,255,0.7)"} 
                                    />
                                )}
                            </View>

                        </MotiView>

                        {/* РЕАКЦІЇ винесені назовні (ефект Telegram) */}
                        {aggregatedReactions.length > 0 && (
                            <View style={[
                                styles.reactionsContainer,
                                { 
                                    position: 'absolute', 
                                    bottom: -6, // Зсуваємо вниз на край баблу
                                    zIndex: 10,
                                    flexDirection: 'row',
                                    margin: 0, padding: 0
                                },
                                isMyMessage ? { right: 8 } : { left: 8 }
                            ]}>
                                <AnimatePresence>
                                    {aggregatedReactions.map((r, index) => (
                                        <MotiView 
                                            key={`${r.emoji}-${index}`}
                                            from={{ scale: 0 }} animate={{ scale: 1 }}
                                            style={[
                                                styles.reactionBadge, 
                                                isMyMessage ? styles.reactionBadgeMy : styles.reactionBadgeOther,
                                                // Додаємо легку тінь, щоб реакції гарно виділялись поверх баблу і фону
                                                { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 3 }
                                            ]}
                                        >
                                            <Text style={[styles.reactionBadgeText, isMyMessage ? styles.reactionBadgeTextMy : styles.reactionBadgeTextOther]}>
                                                {r.emoji} {r.count > 1 ? r.count : ''}
                                            </Text>
                                        </MotiView>
                                    ))}
                                </AnimatePresence>
                            </View>
                        )}
                    </View>

                    {selectionMode && isMyMessage && (
                        <View style={{ justifyContent: 'center', marginLeft: 8 }}>
                            <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={22} color={isSelected ? colors.primary : colors.secondaryText} />
                        </View>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
};

export default memo(MessageBubble, arePropsEqual);