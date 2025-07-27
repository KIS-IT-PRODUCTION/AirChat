import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Modal, Pressable, Alert, Linking } from 'react-native';
import { useTheme } from './ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import moment from 'moment';
import { useTranslation } from 'react-i18next'; // ✨ ІМПОРТ

const mockMessages = [
    { id: '9', location: { latitude: 48.2917, longitude: 25.9354 }, time: '09:43', sender: 'other' },
    { id: '8', image: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=250', time: '09:42', sender: 'me', status: 'read' },
    { id: '7', text: 'Доброго вечора! Я вже під’їжджаю. Буду за 2 хвилини.', time: '09:41', sender: 'other' },
    { id: '6', text: 'Добре.', time: '09:41', sender: 'me', status: 'read' },
    { id: '1', textKey: 'chat.today', isDateSeparator: true }, // ✨ Змінено на ключ
];

// Компонент для повноекранного перегляду фото
const ImageViewerModal = ({ visible, uri, onClose }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    if (!uri) return null;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.imageViewerBackdrop} onPress={onClose}>
                <Image
                    source={{ uri }}
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                />
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close-circle" size={32} color="white" />
                </TouchableOpacity>
            </Pressable>
        </Modal>
    );
};

// Компонент для одного повідомлення в чаті
const MessageBubble = ({ message, onImagePress }) => {
    const { colors } = useTheme();
    const { t } = useTranslation(); // ✨
    const styles = getStyles(colors);
    const isMyMessage = message.sender === 'me';

    const openMap = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${message.location.latitude},${message.location.longitude}`;
        const label = t('chat.locationLabel');
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    if (message.isDateSeparator) {
        return (
            <View style={styles.dateSeparatorContainer}>
                <Text style={styles.dateSeparatorText}>{t(message.textKey)}</Text>
            </View>
        );
    }
    
    return(
        <View style={[styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble, (message.image || message.location) && { padding: 4 }]}>
                {message.text && <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>{message.text}</Text>}
                
                {message.image && (
                    <TouchableOpacity onPress={() => onImagePress(message.image)}>
                        <Image source={{ uri: message.image }} style={styles.messageImage} />
                    </TouchableOpacity>
                )}
                
                {message.location && (
                    <TouchableOpacity onPress={openMap}>
                        <MapView
                            style={styles.messageMap}
                            initialRegion={{ ...message.location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                        >
                            <Marker coordinate={message.location} />
                        </MapView>
                    </TouchableOpacity>
                )}
                
                <View style={[styles.messageInfo, (message.image || message.location) && styles.messageInfoOverlay]}>
                    <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>{message.time}</Text>
                    {isMyMessage && <Ionicons name="checkmark-done" size={16} color="#4FC3F7" />}
                </View>
            </View>
        </View>
    );
};

// Основний компонент екрана
export default function IndividualChatScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation(); // ✨
    const styles = getStyles(colors);
    const route = useRoute();
    const navigation = useNavigation();
    const { userName, userAvatar } = route.params;
    const [messages, setMessages] = useState(mockMessages);
    const [inputText, setInputText] = useState('');
    const [isAttachmentModalVisible, setAttachmentModalVisible] = useState(false);
    const [viewingImageUri, setViewingImageUri] = useState(null);

    const sendMessage = (messageContent) => {
        const newMessage = {
            id: Math.random().toString(),
            time: moment().format('HH:mm'),
            sender: 'me',
            status: 'sent',
            ...messageContent,
        };
        setMessages(prevMessages => [newMessage, ...prevMessages]);
    };

    const handleSendText = () => {
        const textToSend = inputText.trim();
        if (textToSend.length > 0) {
            sendMessage({ text: textToSend });
            setInputText('');
        }
    };

    const pickImage = async () => {
        setAttachmentModalVisible(false);
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('chat.galleryPermissionError'));
            return;
        }

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
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('chat.cameraPermissionError'));
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            sendMessage({ image: result.assets[0].uri });
        }
    };
    
    const handleSendLocation = async () => {
        setAttachmentModalVisible(false);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('common.error'), t('chat.locationPermissionError'));
            return;
        }

        let location = await Location.getCurrentPositionAsync({});
        sendMessage({ location: { latitude: location.coords.latitude, longitude: location.coords.longitude } });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                    <Text style={styles.headerUserName}>{userName}</Text>
                    <Text style={styles.headerUserStatus}>{t('chat.onlineStatus')}</Text>
                </View>
                <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
            </View>

           <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <FlatList
                    data={messages}
                    renderItem={({ item }) => <MessageBubble message={item} onImagePress={setViewingImageUri} />}
                    keyExtractor={item => item.id}
                    inverted
                    contentContainerStyle={{ padding: 10 }}
                    style={{ flex: 1 }}
                />
                
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={() => setAttachmentModalVisible(true)}>
                        <Ionicons name="add" size={30} color={colors.secondaryText} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder={t('chat.placeholder')}
                        placeholderTextColor={colors.secondaryText}
                        value={inputText}
                        onChangeText={setInputText}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
                        <Ionicons name="paper-plane" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

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

            <ImageViewerModal
                visible={!!viewingImageUri}
                uri={viewingImageUri}
                onClose={() => setViewingImageUri(null)}
            />
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
    messageBubble: { borderRadius: 20, padding: 10, maxWidth: '75%' },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 15 },
    myMessageText: { color: '#FFFFFF' },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    messageMap: { width: 220, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center' },
    messageInfoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    messageTime: { color: '#FFFFFF', fontSize: 11, marginRight: 4 },
    myMessageTime: { color: '#FFFFFF' },
    
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 10, color: colors.text },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },

    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.text, fontSize: 18, marginLeft: 15 },

    imageViewerBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeButton: { position: 'absolute', top: 50, right: 20, padding: 10 },
});