// ChatInput.js
import React, { memo } from 'react';
import { View, TextInput, TouchableOpacity, Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const ChatInput = memo(({ 
    inputText, handleTyping, handleSendText, editingMessage, 
    setAttachmentModalVisible, textInputRef, styles, colors, insets
}) => {
    const { t } = useTranslation();
    
    return (
        // 💡 ОПТИМІЗАЦІЯ: Використовуємо insets для точного відступу на iOS
        <View style={[styles.inputContainer, { 
            marginBottom: Platform.OS === 'ios' ? insets.bottom : styles.inputContainer.paddingBottom
        }]}>
            <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}>
                <Ionicons name="add" size={30} color={colors.secondaryText} />
            </TouchableOpacity>
            
            <TextInput 
                ref={textInputRef} 
                style={styles.textInput} 
                value={inputText} 
                onChangeText={handleTyping} 
                placeholder={t('chat.placeholder')} 
                placeholderTextColor={colors.secondaryText} 
                multiline 
                blurOnSubmit={false} 
            />
            
            <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
                <Ionicons name={editingMessage ? "checkmark" : "paper-plane"} size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}, (prevProps, nextProps) => {
    // 💡 ПЕРЕВІРКА ПРОПСІВ: Тільки inputText викликає ререндер
    return (
        prevProps.inputText === nextProps.inputText &&
        prevProps.editingMessage === nextProps.editingMessage 
        // Функції та стилі вважаються стабільними (завдяки useCallback та memo)
    );
});

export default ChatInput;