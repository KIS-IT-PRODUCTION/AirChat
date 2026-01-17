import { StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    
    // --- HEADER ---
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(0,0,0,0.05)', 
        backgroundColor: colors.card,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 5,
        zIndex: 20,
        elevation: 3,
    },
    headerUserInfo: { flex: 1, alignItems: 'center', alignSelf: 'center', justifyContent: 'center' },
    headerUserName: { color: colors.text, fontSize: 17, fontWeight: '700' },
    headerUserStatus: { color: colors.secondaryText, fontSize: 13 },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border },

    // --- PINNED ---
    pinnedContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        backgroundColor: colors.card, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(0,0,0,0.05)', 
        position: 'absolute', 
        left: 0, 
        right: 0, 
        zIndex: 15,
        elevation: 2
    },
    pinnedLine: { width: 3, height: '90%', backgroundColor: colors.primary, borderRadius: 26, marginRight: 12 },
    pinnedContentTouchable: { flex: 1, justifyContent: 'center' },
    pinnedTitle: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    pinnedText: { color: colors.secondaryText, fontSize: 13 },
    pinnedClose: { padding: 8 },
    pinnedCountBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
    pinnedCountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

    // --- REPLY BAR ---
    replyBarContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 10, 
        backgroundColor: colors.card, 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(0,0,0,0.05)'
    },
    replyBarLine: { width: 4, height: 36, backgroundColor: colors.primary, borderRadius: 2, marginHorizontal: 12 },
    replyBarContent: { flex: 1 },
    replyBarTitle: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    replyBarText: { color: colors.secondaryText, fontSize: 13 },
    replyBarClose: { padding: 6 },

    // --- LIST ---
    flatListContent: { paddingBottom: 15 },
    dateSeparator: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginVertical: 16 },
    dateSeparatorText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },

    // --- MESSAGE CONTAINER ---
    messageContainer: { 
        marginVertical: 2, 
        width: '100%',
        paddingHorizontal: 8, 
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    myMessageContainer: { justifyContent: 'flex-end' },
    theirMessageContainer: { justifyContent: 'flex-start' },

    messageRow: { flexDirection: 'row', alignItems: 'flex-end' },

    // --- BUBBLES ---
    bubble: { 
        borderRadius: 20, 
        paddingVertical: 6, 
        paddingHorizontal: 12, 
        maxWidth: width * 0.78,
        minWidth: 80,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
        position: 'relative'
    },
    myBubble: { 
        backgroundColor: "#0c81bfff", 
        borderBottomRightRadius: 2, 
    },
    theirBubble: { 
        backgroundColor: colors.card, 
        borderBottomLeftRadius: 2, 
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    
    replyContainerBubble: { 
        marginBottom: 6, 
        padding: 6, 
        backgroundColor: 'rgba(0,0,0,0.05)', 
        borderRadius: 8, 
        borderLeftWidth: 3, 
    },
    replyTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 2, opacity: 0.95 },
    replyText: { fontSize: 12, opacity: 0.85 },

    // --- TEXT ---
    messageText: { fontSize: 16, lineHeight: 22 },
    myMessageText: { color: '#FFFFFF' },
    theirMessageText: { color: colors.text },
    
    // --- FOOTER (TIME) ---
    messageFooter: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        marginTop: 4, 
        minHeight: 16,
    },
    messageInfoOverlay: { 
        position: 'absolute', 
        bottom: 6, 
        right: 8, 
        marginTop: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', 
        borderRadius: 10, 
        paddingHorizontal: 6, 
        paddingVertical: 2 
    },
    
    messageTime: { fontSize: 11, fontWeight: '500' },
    myMessageTime: { color: 'rgba(255,255,255,0.9)' },
    theirMessageTime: { color: colors.text, opacity: 0.6 },

    // --- REACTIONS ---
    reactionsContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        marginTop: 4, 
        marginBottom: 1,
    },
    reactionBadge: { 
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 3, 
        marginRight: 4, 
        marginBottom: 3, 
        borderWidth: 1, 
        flexDirection: 'row',
        alignItems: 'center'
    },
    reactionBadgeMy: { 
        backgroundColor: 'rgba(255,255,255,0.25)', 
        borderColor: 'rgba(255,255,255,0.4)' 
    },
    reactionBadgeOther: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderColor: 'rgba(0,0,0,0.08)',
    },
    reactionBadgeText: { fontSize: 11, fontWeight: '700' },
    reactionBadgeTextMy: { color: '#FFFFFF' },
    reactionBadgeTextOther: { color: colors.text },

    // --- MEDIA ---
    messageImage: { width: 240, height: 280, borderRadius: 16, marginBottom: 2 },
    messageMap: { width: 240, height: 150, borderRadius: 16 },
    imageLoadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 16 },
    
    // --- LINK PREVIEW ---
    linkPreviewContainer: { marginTop: 6, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.05)' },
    linkPreviewImage: { width: '100%', height: 130 },
    linkPreviewTextContainer: { padding: 10 },
    linkPreviewTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
    linkPreviewDesc: { fontSize: 11, opacity: 0.8 },
    otherLinkPreviewTitle: { color: colors.text },
    otherLinkPreviewDesc: { color: colors.secondaryText },

    // --- INPUT AREA ---
    inputWrapper: { 
        backgroundColor: 'transparent', 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(0,0,0,0.05)', 
        paddingHorizontal: 10, 
        paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 20 : 10
    },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        backgroundColor: colors.background, 
        borderRadius: 26, 
        paddingHorizontal: 6, 
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.border
    },
    textInput: { 
        flex: 1, 
        color: colors.text, 
        fontSize: 16, 
        maxHeight: 120,
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'ios' ? 12 : 8,
        paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    },
    attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    sendButton: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 2, marginLeft: 6 },

    // --- MODALS ---
    modalBackdropAttachments: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    attachmentContainer: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    attachmentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    attachmentText: { fontSize: 17, marginLeft: 15, color: colors.text },
    attachmentCancel: { marginTop: 10, alignItems: 'center', paddingVertical: 15 },
    
    // --- ACTION SHEET ---
    actionSheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    actionSheetContainer: { marginHorizontal: 10, marginBottom: 15 },
    reactionPickerContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 18, padding: 14, justifyContent: 'space-between', marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
    actionButtonsContainer: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden' },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    actionButtonText: { color: colors.text, fontSize: 17, marginLeft: 15 },
    cancelButton: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 8, alignItems: 'center' },
    cancelButtonText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
    reactionEmojiButton: { padding: 5 },
    reactionEmojiText: { fontSize: 30 },

    saveButtonContainer: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(30,30,30,0.8)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', zIndex: 999 },
    saveButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },
});