import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Modal, Pressable } from 'react-native';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; // ✨ Імпорт для роботи з зображеннями
import moment from 'moment'; // Для відображення часу

const mockMessages = [
    { id: '8', image: 'https://i.pravatar.cc/400?u=carphoto', time: '09:42', sender: 'me', status: 'read' },
    { id: '7', text: 'Доброго вечора! Я вже під’їжджаю. Буду за 2 хвилини.', time: '09:41', sender: 'other' },
    { id: '6', text: 'Добре.', time: '09:41', sender: 'me', status: 'read' },
    { id: '5', text: 'Ага, бачу! Йду до вас.', time: '09:41', sender: 'other' },
    { id: '4', text: 'Бачу вас. Машина сіра Skoda.', time: '09:41', sender: 'me', status: 'read' },
    { id: '3', text: 'Чудово, чекаю! Я стою біля входу в магазин', time: '09:41', sender: 'other' },
    { id: '2', text: 'Доброго вечора! Я вже під’їжджаю. Буду за 2 хвилини.', time: '09:41', sender: 'me', status: 'read' },
    { id: '1', text: 'Сьогодні', isDateSeparator: true },
];

const MessageBubble = ({ message }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const isMyMessage = message.sender === 'me';

    if (message.isDateSeparator) {
        return (
            <View style={styles.dateSeparatorContainer}>
                <Text style={styles.dateSeparatorText}>{message.text}</Text>
            </View>
        );
    }
    
    return(
        <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble]}>
                {/* ✨ Відображення або тексту, або зображення */}
                {message.text ? (
                    <Text style={styles.messageText}>{message.text}</Text>
                ) : (
                    <Image source={{ uri: message.image }} style={styles.messageImage} />
                )}
                <View style={styles.messageInfo}>
                    <Text style={styles.messageTime}>{message.time}</Text>
                    {isMyMessage && <Ionicons name="checkmark-done" size={16} color="#4FC3F7" />}
                </View>
            </View>
        </View>
    );
};

export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const route = useRoute();
    const navigation = useNavigation();
    const { userName, userAvatar } = route.params;
    const [messages, setMessages] = useState(mockMessages);
    const [inputText, setInputText] = useState('');
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);

    // ✨ Функція для надсилання нового повідомлення (текст або фото)
    const sendMessage = (messageContent) => {
        const newMessage = {
            id: Math.random().toString(),
            time: moment().format('HH:mm'),
            sender: 'me',
            status: 'sent',
            ...messageContent, // { text: '...' } або { image: '...' }
        };
        setMessages(prevMessages => [newMessage, ...prevMessages]);
    };

    const handleSendText = () => {
        if (inputText.trim().length > 0) {
            sendMessage({ text: inputText.trim() });
            setInputText('');
        }
    };

    // ✨ Функції для роботи з галереєю та камерою
    const pickImage = async () => {
        setAttachmentModalVisible(false);
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            sendMessage({ image: result.assets[0].uri });
        }
    };

    const takePhoto = async () => {
        setAttachmentModalVisible(false);
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            sendMessage({ image: result.assets[0].uri });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                    <Text style={styles.headerUserName}>{userName}</Text>
                    <Text style={styles.headerUserStatus}>у мережі 5 хв тому</Text>
                </View>
                <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
            </View>

            <FlatList
                data={messages}
                renderItem={({ item }) => <MessageBubble message={item} />}
                keyExtractor={item => item.id}
                inverted
                contentContainerStyle={{ padding: 10 }}
            />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={90}
            >
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}>
                        <Ionicons name="add" size={30} color={colors.secondaryText} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Напишіть повідомлення"
                        placeholderTextColor={colors.secondaryText}
                        value={inputText}
                        onChangeText={setInputText}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
                        <Ionicons name="paper-plane" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* ✨ Модальне вікно для вибору фото */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isAttachmentModalVisible}
                onRequestClose={() => setAttachmentModalVisible(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setAttachmentModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={24} color={colors.primary} />
                            <Text style={styles.modalButtonText}>Зробити фото</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButton} onPress={pickImage}>
                            <Ionicons name="image-outline" size={24} color={colors.primary} />
                            <Text style={styles.modalButtonText}>Обрати з галереї</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerUserInfo: { flex: 1, alignItems: 'center' },
    headerUserName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20 },
    
    dateSeparatorContainer: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginVertical: 10 },
    dateSeparatorText: { color: colors.secondaryText, fontSize: 12 },
    
    messageRow: { flexDirection: 'row', marginVertical: 4 },
    messageBubble: { borderRadius: 20, padding: 12, maxWidth: '75%' },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 15 },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center' },
    messageTime: { color: '#9E9E9E', fontSize: 11, marginRight: 4 },
    
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.card },
    textInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 10, color: colors.text },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },

    // Стилі для модального вікна
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.text, fontSize: 18, marginLeft: 15 },
});