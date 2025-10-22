// ChatStyles.js
import { StyleSheet, Platform, StatusBar } from 'react-native';

// 💡 ОПТИМІЗАЦІЯ: Стилі створюються один раз і передаються.
export const getStyles = (colors) => StyleSheet.create({
    // --- ЗАГАЛЬНІ СТИЛІ ---
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    contentArea: { flex: 1, backgroundColor: colors.background },
    keyboardAvoidingView: { flex: 1, backgroundColor: colors.background },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    loadingText: { color: '#fff', marginTop: 10, fontSize: 16 },

    // --- FlatList СТИЛІ ---
    flatList: { flex: 1, backgroundColor: colors.background },
    flatListContent: { paddingHorizontal: 10, paddingTop: 10 },

    // --- HEADER СТИЛІ ---
    header: { 
        flexDirection: 'row', 
        alignItems: 'center',  
        justifyContent: 'space-between',
        paddingHorizontal: 12, 
        paddingVertical: 5, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border, 
        paddingTop: 0, 
        backgroundColor: colors.card 
    },
    headerUserInfo: { alignItems: 'center', paddingHorizontal: 10 },
    headerUserName: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 12 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
    selectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === 'android' ? 25 : 5, backgroundColor: colors.card },
    selectionCountText: { color: colors.text, fontSize: 18, fontWeight: 'bold' },

    // --- MESSAGE BUBBLE СТИЛІ ---
    messageContainer: { marginVertical: 2, paddingHorizontal: 0},
    messageRow: { flexDirection: 'row', alignItems: 'center' },
    messageBubble: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
    myMessageBubble: { backgroundColor: '#00537A', borderBottomRightRadius: 4 },
    otherMessageBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    messageText: { color: colors.text, fontSize: 15, lineHeight: 20 },
    myMessageText: { color: '#FFFFFF' },
    messageImage: { width: 200, height: 150, borderRadius: 15 },
    imageLoadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15 },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 15 },
    messageMap: { width: 220, height: 150, borderRadius: 15 },
    messageInfo: { flexDirection: 'row', alignSelf: 'flex-end', marginTop: 4, alignItems: 'center', gap: 4 },
    messageInfoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    messageTime: { color: colors.secondaryText, fontSize: 11 },
    myMessageTime: { color: '#FFFFFF90' },
    reactionsContainer: { flexDirection: 'row', marginTop: -8, marginLeft: 10, marginRight: 10, zIndex: 10, position: 'relative' },
    reactionBadge: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    reactionBadgeText: { fontSize: 12, color: colors.text },
    selectionCircleContainer: { width: 40, justifyContent: 'center', alignItems: 'center' },
    selectionCircleEmpty: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.secondaryText },
    dateSeparator: { alignSelf: 'center', backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginVertical: 10 },
    dateSeparatorText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },

    // --- INPUT СТИЛІ ---
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderTopColor: colors.border, 
        backgroundColor: colors.card,
        borderRadius: 30,
        paddingHorizontal:10,
        paddingVertical:10,
        paddingBottom: Platform.OS === 'android' ? 10 : 0, // Додатковий відступ для Android
    },
    textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 0, marginHorizontal: 10, color: colors.text, maxHeight: 120, fontSize: 16 },
    sendButton: { backgroundColor: colors.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },

    // --- MODAL СТИЛІ ---
    actionSheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', },
    actionSheetContainer: { marginHorizontal: 10, },
    reactionPickerContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 20, padding: 8, justifyContent: 'space-around', alignItems: 'center', marginBottom: 8, elevation: 4, shadowOpacity: 0.1, shadowRadius: 5, },
    reactionEmojiButton: { padding: 4, },
    reactionEmojiText: { fontSize: 28, },
    actionButtonsContainer: { backgroundColor: colors.card, borderRadius: 20, },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, },
    actionButtonText: { color: colors.text, fontSize: 18, marginLeft: 15, },
    cancelButton: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 8, alignItems: 'center', },
    cancelButtonText: { color: colors.primary, fontSize: 18, fontWeight: '600', },
    modalBackdropAttachments: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
    modalButtonText: { color: colors.text, fontSize: 18, marginLeft: 15 },
});