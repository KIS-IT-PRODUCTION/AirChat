// ChatHeader.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MotiView, AnimatePresence } from 'moti';

// 💡 ДОПОМІЖНИЙ КОМПОНЕНТ: Індикатор набору тексту
const TypingIndicator = memo(() => {
    const { t } = useTranslation();
    // Простий статичний індикатор для прикладу
    return (
        <View style={stylesLocal.typingContainer}>
            <Text style={stylesLocal.typingText}>{t('chat.typing', 'Набирає...')}</Text>
        </View>
    );
});

// 💡 ДОПОМІЖНИЙ КОМПОНЕНТ: Header в режимі виділення
const SelectionHeader = memo(({ selectionCount, onCancel, onDelete, styles }) => {
    const { t } = useTranslation();
    return (
        <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={onCancel}>
                <Ionicons name="close" size={28} color={styles.selectionCountText.color} />
            </TouchableOpacity>
            <Text style={styles.selectionCountText}>{selectionCount}</Text>
            <TouchableOpacity onPress={onDelete}>
                <Ionicons name="trash-outline" size={26} color={styles.selectionCountText.color} />
            </TouchableOpacity>
        </View>
    );
});

const ChatHeader = memo(({ 
    selectionMode, selectedMessagesSize, onCancel, onDelete, styles, navigation,
    recipientInfo, isRecipientTyping, userStatus, recipientId
}) => {
    
    if (selectionMode) {
        return (
            <SelectionHeader 
                selectionCount={selectedMessagesSize} 
                onCancel={onCancel} 
                onDelete={onDelete} 
                styles={styles} 
            />
        );
    }
    
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back-circle" size={40} color={styles.headerUserName.color} />
            </TouchableOpacity>
            
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
                <Image 
                    source={recipientInfo.avatar ? { uri: recipientInfo.avatar } : require('../../assets/default-avatar.png')} 
                    style={styles.headerAvatar} 
                    cachePolicy="disk" 
                />
            </TouchableOpacity>                
        </View>
    );
});

export default ChatHeader;

// Локальні стилі для TypingIndicator (для простоти)
const stylesLocal = StyleSheet.create({
    typingContainer: {
        minHeight: 16,
        justifyContent: 'center',
    },
    typingText: {
        fontSize: 12, 
        color: '#4FC3F7', // Синій для індикації активності
        fontWeight: '500',
    }
});