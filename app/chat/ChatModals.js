// ChatModals.js
import React, { memo, useMemo } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ImageViewing from 'react-native-image-viewing'; 

// 💡 ДОПОМІЖНИЙ КОМПОНЕНТ (З ВАШОГО КОДУ)
export const ImageViewerModal = memo(({ visible, uri, onClose }) => {
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

// 💡 ДОПОМІЖНИЙ КОМПОНЕНТ (З ВАШОГО КОДУ)
export const MessageActionSheet = memo(({ visible, onClose, message, isMyMessage, onCopy, onEdit, onDelete, onReact, onSelect, styles }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    if (!message) return null;
    
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const handleAction = (action) => { action(); onClose(); };
    
    // Використовуємо кольори зі стилів
    const destructiveColor = '#D83C3C';
    const primaryColor = styles.cancelButtonText.color;
    const textColor = styles.actionButtonText.color;

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.actionSheetBackdrop} onPress={onClose}>
                <Pressable style={[styles.actionSheetContainer, { marginBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
                    <View style={styles.reactionPickerContainer}>
                        {reactions.map(emoji => ( 
                            <TouchableOpacity key={emoji} onPress={() => handleAction(() => onReact(emoji))} style={styles.reactionEmojiButton}>
                                <Text style={styles.reactionEmojiText}>{emoji}</Text>
                            </TouchableOpacity> 
                        ))}
                    </View>
                    <View style={styles.actionButtonsContainer}>
                        {isMyMessage && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onSelect)}><Ionicons name="checkmark-circle-outline" size={22} color={textColor} /><Text style={styles.actionButtonText}>{t('chat.select', 'Вибрати')}</Text></TouchableOpacity> )}
                        {message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onCopy)}><Ionicons name="copy-outline" size={22} color={textColor} /><Text style={styles.actionButtonText}>{t('chat.copy', 'Копіювати')}</Text></TouchableOpacity> )}
                        {isMyMessage && message.content && ( <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(onEdit)}><Ionicons name="create-outline" size={22} color={textColor} /><Text style={styles.actionButtonText}>{t('chat.edit', 'Редагувати')}</Text></TouchableOpacity> )}
                        {isMyMessage && ( <TouchableOpacity style={[styles.actionButton, { borderBottomWidth: 0 }]} onPress={() => handleAction(onDelete)}><Ionicons name="trash-outline" size={22} color={destructiveColor} /><Text style={[styles.actionButtonText, { color: destructiveColor }]}>{t('common.delete', 'Видалити')}</Text></TouchableOpacity> )}
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>{t('common.cancel', 'Скасувати')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
});

// 💡 ДОПОМІЖНИЙ КОМПОНЕНТ: Модалка вкладень
export const AttachmentModal = memo(({ visible, onClose, takePhoto, pickImage, handleSendLocation, styles, colors }) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdropAttachments} onPress={onClose}>
                <View style={[styles.modalContent, { marginBottom: insets.bottom > 0 ? insets.bottom : 20 }]}> 
                    <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={24} color={colors.primary} />
                        <Text style={styles.modalButtonText}>{t('chat.takePhoto')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                        <Ionicons name="image-outline" size={24} color={colors.primary} />
                        <Text style={styles.modalButtonText}>{t('chat.pickFromGallery')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButton} onPress={handleSendLocation}>
                        <Ionicons name="location-outline" size={24} color={colors.primary} />
                        <Text style={styles.modalButtonText}>{t('chat.shareLocation')}</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
});