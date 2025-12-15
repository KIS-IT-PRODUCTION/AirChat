import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { useTranslation } from 'react-i18next'; 
import { getStyles } from './ChatStyles';

const PinnedMessageBar = ({ messages, onUnpin, onPress, colors }) => {
    const { t } = useTranslation();
    
    if (!messages || messages.length === 0) return null;
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const styles = getStyles(colors);
    
    const safeIndex = currentIndex >= messages.length ? 0 : currentIndex;
    const activeMessage = messages[safeIndex];

    const handleScrollToActive = () => {
        if (activeMessage) {
            onPress(activeMessage);
        }
    };

    const cycleMessage = () => {
        if (messages.length > 1) {
            setCurrentIndex((prev) => (prev + 1) % messages.length);
        }
    };

    return (
        <MotiView 
            from={{ translateY: -50, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.pinnedContainer}
        >            
            <TouchableOpacity style={styles.pinnedContentTouchable} onPress={handleScrollToActive} activeOpacity={0.7}>
                <Text style={styles.pinnedTitle}>{t('chat.pinnedMessage', 'Закріплене повідомлення')}</Text>
                <AnimatePresence exitBeforeEnter>
                    <MotiView 
                        key={activeMessage.id}
                        from={{ opacity: 0, translateY: 5 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        exit={{ opacity: 0, translateY: -5 }}
                        transition={{ type: 'timing', duration: 200 }}
                    >
                        <Text style={styles.pinnedText} numberOfLines={1}>
                            {activeMessage.content || (activeMessage.image_url ? t('chat.attachment', 'Вкладення') : '...')}
                        </Text>
                    </MotiView>
                </AnimatePresence>
            </TouchableOpacity>
            
            {messages.length > 1 && (
                <TouchableOpacity onPress={cycleMessage} style={styles.pinnedCountBadge}>
                    <Text style={styles.pinnedCountText}>{safeIndex + 1}/{messages.length}</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => onUnpin(activeMessage.id)} style={styles.pinnedClose}>
                <Ionicons name="close" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
        </MotiView>
    );
};

export default PinnedMessageBar;