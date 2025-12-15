import React, { useState, useRef, useEffect, memo } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStyles } from './ChatStyles';
import { MotiView, AnimatePresence } from 'moti';

const ChatInput = memo(({ onSendText, onTyping, onAttachmentPress, isEditing, replyTo, onCancelReply, colors, t }) => {
    const [text, setText] = useState('');
    const styles = getStyles(colors);
    const textInputRef = useRef(null);

    useEffect(() => {
        if (isEditing) {
            setText(isEditing.content);
            textInputRef.current?.focus();
        }
    }, [isEditing]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSendText(trimmed);
        setText('');
    };

    const hasText = text.trim().length > 0;

    return (
        <View style={styles.inputWrapper}>
            {replyTo && (
                <MotiView 
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.replyBarContainer}
                >
                    <View style={styles.replyBarLine} />
                    <View style={styles.replyBarContent}>
                        <Text style={styles.replyBarTitle}>{t('chat.replyTo', 'Відповідь')}</Text>
                        <Text style={styles.replyBarText} numberOfLines={1}>
                            {replyTo.content || (replyTo.image_url ? t('chat.photo', 'Фото') : '...')}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onCancelReply} style={styles.replyBarClose}>
                        <Ionicons name="close-circle" size={22} color={colors.secondaryText} />
                    </TouchableOpacity>
                </MotiView>
            )}

            <View style={styles.inputContainer}>
                <TouchableOpacity onPress={onAttachmentPress} style={styles.attachButton}>
                    <Ionicons name="add-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
                
                <TextInput
                    ref={textInputRef}
                    style={styles.textInput}
                    value={text}
                    onChangeText={(val) => { setText(val); onTyping(val); }}
                    placeholder={t('chat.placeholder', 'Повідомлення...')}
                    placeholderTextColor={colors.secondaryText}
                    multiline
                />
                
                <TouchableOpacity 
                    style={[
                        styles.sendButton, 
                        { backgroundColor: hasText ? colors.primary : colors.border }
                    ]} 
                    onPress={handleSend}
                    disabled={!hasText}
                >
                    <AnimatePresence>
                        {hasText ? (
                            <MotiView 
                                from={{ scale: 0 }} 
                                animate={{ scale: 1 }} 
                                transition={{ type: 'spring' }}
                            >
                                <Ionicons name={isEditing ? "checkmark" : "arrow-up"} size={24} color="#fff" />
                            </MotiView>
                        ) : (
                            <Ionicons name="arrow-up" size={24} color={colors.secondaryText} />
                        )}
                    </AnimatePresence>
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default ChatInput;