import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef, forwardRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  TextInput, Modal, Pressable, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, FlatList, Switch
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import 'moment/locale/en-gb';
import _ from 'lodash';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';

import Logo from '../assets/icon.svg';
import GroupTransferIcon from '../assets/group.svg';
import IndividualTransferIcon from '../assets/induvidual.svg';
import Pet from '../assets/pets.png';

// --- FormContext та Provider ---
const FormContext = createContext();

export const FormProvider = ({ children }) => {
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [flightNumber, setFlightNumber] = useState('');
    const [luggageInfo, setLuggageInfo] = useState('');
    const [activeTab, setActiveTab] = useState('to');
    const [transferType, setTransferType] = useState('individual');
    const [withPet, setWithPet] = useState(false);
    const [meetWithSign, setMeetWithSign] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [passengerCounts, setPassengerCounts] = useState({ adults: 1, children: 0, infants: 0 });

    const value = {
        fromLocation, setFromLocation,
        toLocation, setToLocation,
        flightNumber, setFlightNumber,
        luggageInfo, setLuggageInfo,
        activeTab, setActiveTab,
        transferType, setTransferType,
        withPet, setWithPet,
        meetWithSign, setMeetWithSign,
        selectedDate, setSelectedDate,
        passengerCounts, setPassengerCounts,
    };

    return (
        <FormContext.Provider value={value}>
            {children}
        </FormContext.Provider>
    );
};

export const useFormState = () => {
    return useContext(FormContext);
};


// --- СТИЛІ ---
const shadowStyle = { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 };

const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    scrollContent: { paddingBottom: 40 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 24, 
        paddingHorizontal: 15, 
        paddingTop: 16 
    },
    profilePic: { width: 40, height: 40, borderRadius: 20 },
    profilePlaceholder: { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: 40, height: 40, borderRadius: 20 },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        backgroundColor: colors.card,
        paddingVertical: Platform.OS === 'ios' ? 6 : 2,
        paddingHorizontal: 10,
        borderRadius: 20,
        ...shadowStyle,
    },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 24, marginHorizontal: 15, ...(theme === 'light' ? shadowStyle : {}) },
    tab: { flex: 1, paddingVertical: 16, borderRadius: 8 },
    activeTab: { backgroundColor: colors.primary },
    tabText: { color: colors.text, textAlign: 'center', fontWeight: '600', fontSize: 14 },
    activeTabText: { color: '#FFFFFF' },
    title: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16, paddingHorizontal: 15 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        marginBottom: 16,
        marginHorizontal: 15,
        ...(theme === 'light' ? shadowStyle : {}),
    },
    inputRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    errorHighlight: {
        borderColor: '#FFD700',
        backgroundColor: theme === 'light' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.15)',
    },
    textInput: { 
        color: colors.text, 
        fontSize: 16, 
        marginLeft: 12, 
        flex: 1 
    },
    clearIcon: { marginLeft: 8, padding: 4 },
    divider: { height: 1, backgroundColor: colors.border || '#EFEFF4' },
    detailsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    detailItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    detailLabel: { color: colors.secondaryText, fontSize: 12, marginBottom: 4 },
    detailValueContainer: { flexDirection: 'row', alignItems: 'center' },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    verticalDivider: { height: '60%', width: 1, backgroundColor: colors.border || '#EFEFF4' },
    radioGroupContainer: { flexDirection: 'row', gap: 12, marginBottom: 16, marginHorizontal: 15 },
    radioContainer: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 2, height: 110, ...(theme === 'light' ? shadowStyle : {}) },
    radioContainerActive: { backgroundColor: theme === 'light' ? '#EBF5FF' : 'rgba(10, 132, 255, 0.2)', borderColor: colors.primary },
    radioText: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    radioTextActive: { color: colors.primary },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, justifyContent: 'space-between' },
    checkboxTextContainer: { flex: 1 },
    petImage: { width: 40, height: 40 },
    checkboxSubtext: { color: colors.secondaryText, fontSize: 14, textAlign: 'center' },
    submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 15, ...(theme === 'light' ? shadowStyle : {}) },
    submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400, alignItems: 'center', ...shadowStyle },
    modalCloseButton: { position: 'absolute', top: 16, right: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 15, color: colors.secondaryText, textAlign: 'center', marginBottom: 24 },
    modalCommentInput: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, width: '100%', height: 80, padding: 12, fontSize: 16, color: colors.text, textAlignVertical: 'top', marginBottom: 24 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8, marginTop: 16 },
    modalRowPrimaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center' },
    modalFullWidthPrimaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    modalFullWidthSecondaryButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalSecondaryButton: { backgroundColor: colors.background, paddingVertical: 14, borderRadius: 12, flex: 1, alignItems: 'center', justifyContent: 'center', borderColor: colors.border, borderWidth: 1 },
    modalDestructiveButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalDestructiveButtonText: { color: '#FF453A', fontSize: 16, fontWeight: '600' },
    modalSecondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
    modalPrimaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    successIconContainer: { marginBottom: 16 },
    modalButtonColumn: { width: '100%', marginTop: 8 },
    flightInputContainer: { flexDirection: 'row', alignItems: 'center' },
    infoIcon: { paddingLeft: 12, paddingVertical: 14 },
    signIcon: { width: 40, height: 40, textAlign: 'center' },
    passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    passengerLabel: { color: colors.text, fontSize: 18, fontWeight: '600' },
    passengerSublabel: { color: colors.secondaryText, fontSize: 13 },
    passengerCounter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    passengerCountText: { color: colors.text, fontSize: 22, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
    suggestionsContainer: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, ...shadowStyle, overflow: 'hidden' },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    suggestionTextContainer: { marginLeft: 12, flex: 1 },
    suggestionCity: { color: colors.text, fontSize: 16, fontWeight: '600' },
    suggestionName: { color: colors.secondaryText, fontSize: 13, marginTop: 2 },
});

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

const AuthPromptModal = ({ visible, onClose, onLogin, onRegister }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Text style={styles.modalTitle}>{t('authPrompt.title')}</Text><Text style={styles.modalSubtitle}>{t('authPrompt.subtitle')}</Text><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onRegister}><Text style={styles.modalSecondaryButtonText}>{t('auth.register')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={onLogin}><Text style={styles.modalPrimaryButtonText}>{t('auth.login')}</Text></TouchableOpacity></View></View></View></Modal>);
};

const AddCommentModal = ({ visible, onClose, onCommentSubmit, onCancelTransfer }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    const [comment, setComment] = useState('');
    const handleSendComment = () => { onCommentSubmit(comment); };
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><Pressable style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Ionicons name="pencil-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} /><Text style={styles.modalTitle}>{t('addCommentModal.title')}</Text><Text style={styles.modalSubtitle}>{t('addCommentModal.subtitle')}</Text><TextInput style={styles.modalCommentInput} placeholder={t('addCommentModal.commentPlaceholder')} placeholderTextColor={colors.secondaryText} value={comment} onChangeText={setComment} multiline /><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('addCommentModal.skipButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={handleSendComment}><Text style={styles.modalPrimaryButtonText}>{t('addCommentModal.sendButton')}</Text></TouchableOpacity></View><TouchableOpacity style={styles.modalDestructiveButton} onPress={onCancelTransfer}><Text style={styles.modalDestructiveButtonText}>{t('addCommentModal.cancelTransfer')}</Text></TouchableOpacity></Pressable></KeyboardAvoidingView></Modal>);
};

const TransferSuccessModal = ({ visible, onClose, onViewTransfers }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><View style={styles.successIconContainer}><Ionicons name="checkmark-circle-outline" size={64} color={'#4CAF50'} /></View><Text style={styles.modalTitle}>{t('transferSuccess.title')}</Text><Text style={styles.modalSubtitle}>{t('transferSuccess.subtitle')}</Text><View style={styles.modalButtonColumn}><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onViewTransfers}><Text style={styles.modalPrimaryButtonText}>{t('transferSuccess.viewTransfersButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalFullWidthSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('transferSuccess.closeButton')}</Text></TouchableOpacity></View></View></View></Modal>);
};

const PassengerRow = ({ label, sublabel, count, onUpdate, minCount = 0 }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    return (<View style={styles.passengerRow}><View><Text style={styles.passengerLabel}>{label}</Text><Text style={styles.passengerSublabel}>{sublabel}</Text></View><View style={styles.passengerCounter}><TouchableOpacity onPress={() => onUpdate(-1)} disabled={count <= minCount}><Ionicons name="remove-circle" size={32} color={count <= minCount ? colors.border : colors.primary} /></TouchableOpacity><Text style={styles.passengerCountText}>{count}</Text><TouchableOpacity onPress={() => onUpdate(1)}><Ionicons name="add-circle" size={32} color={colors.primary} /></TouchableOpacity></View></View>);
};

const PassengerSelectorModal = ({ visible, onClose, passengerCounts, setPassengerCounts }) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    const updateCount = (type, amount) => { setPassengerCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] + amount) })); };
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={styles.modalContent}><Text style={styles.modalTitle}>{t('passengers.title')}</Text><PassengerRow label={t('passengers.adults')} sublabel={t('passengers.adultsAge')} count={passengerCounts.adults} onUpdate={(amount) => updateCount('adults', amount)} minCount={1} /><PassengerRow label={t('passengers.children')} sublabel={t('passengers.childrenAge')} count={passengerCounts.children} onUpdate={(amount) => updateCount('children', amount)} /><PassengerRow label={t('passengers.infants')} sublabel={t('passengers.infantsAge')} count={passengerCounts.infants} onUpdate={(amount) => updateCount('infants', amount)} /><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onClose}><Text style={styles.modalPrimaryButtonText}>{t('common.done')}</Text></TouchableOpacity></Pressable></Pressable></Modal>);
};

const GradientCard = ({ children, style }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme); 
    const gradientColors = theme === 'light' ? ['#FFFFFF', '#F7F7F7'] : [colors.card, '#2C2C2E'];
    return (<LinearGradient colors={gradientColors} style={[styles.card, style]}>{children}</LinearGradient>);
};

const InputRow = forwardRef(({ icon, placeholderKey, value, onChangeText, onClear, style, onFocus, onBlur, keyboardType, hasError }, ref) => {
    const { colors, theme } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, theme);
    return (<View ref={ref} style={[styles.inputRow, style, hasError && styles.errorHighlight]}><Ionicons name={icon} size={20} color={colors.secondaryText} /><TextInput placeholder={t(placeholderKey)} placeholderTextColor={colors.secondaryText} style={styles.textInput} value={value} onChangeText={onChangeText} onFocus={onFocus} onBlur={onBlur} keyboardType={keyboardType || 'default'} />{value?.length > 0 && (<TouchableOpacity onPress={onClear} style={styles.clearIcon}><Ionicons name="close-circle" size={20} color={colors.secondaryText} /></TouchableOpacity>)}</View>);
});

const AirportSuggestionsList = ({ suggestions, onSelect, style }) => {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const listHeight = useSharedValue(0);
    const listOpacity = useSharedValue(0);
    const animatedStyle = useAnimatedStyle(() => ({ height: listHeight.value, opacity: listOpacity.value }));
    useEffect(() => {
        if (suggestions.length > 0) {
            listHeight.value = withTiming(220, { duration: 250 });
            listOpacity.value = withTiming(1, { duration: 200 });
        } else {
            listHeight.value = withTiming(0, { duration: 250 });
            listOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [suggestions]);
    const renderItem = ({ item }) => (<TouchableOpacity onPress={() => onSelect(item)} style={styles.suggestionItem}><Ionicons name="airplane-outline" size={24} color={colors.primary} /><View style={styles.suggestionTextContainer}><Text style={styles.suggestionCity}>{`${item.city} (${item.iata_code})`}</Text><Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text></View></TouchableOpacity>);
    return (<Animated.View style={[styles.suggestionsContainer, style, animatedStyle]}><FlatList data={suggestions} renderItem={renderItem} keyExtractor={(item) => item.iata_code} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} /></Animated.View>);
};

const HomeScreenContent = React.memo(({
    navigation, session, t, errors,
    fromLocation, toLocation, flightNumber, luggageInfo,
    activeTab, transferType, withPet, meetWithSign,
    selectedDate, passengerCounts, isSubmitting, userProfile,
    loadingProfile, 
    handleProfilePress, setActiveTab, setAirportSuggestions, handleTextChange,
    handleFocus, handleBlur, showPicker, setPassengerModalVisible,
    setLuggageInfo, setFlightNumber, setTransferType, setWithPet,
    setMeetWithSign, handleOrderPress, handleRoleSwitch, isSwitchingRole,
    fromInputRef, toInputRef
}) => {
    const { colors, theme } = useTheme();
    const { profile } = useAuth();
    const styles = getStyles(colors, theme);
    const totalPassengers = passengerCounts.adults + passengerCounts.children + passengerCounts.infants;

    const roleAnimation = useSharedValue(profile?.role === 'driver' ? 1 : 0);

    useEffect(() => {
        roleAnimation.value = withTiming(profile?.role === 'driver' ? 1 : 0, { duration: 300 });
    }, [profile?.role]);

    const passengerIconStyle = useAnimatedStyle(() => ({
        color: interpolateColor(roleAnimation.value, [0, 1], [colors.primary, colors.secondaryText])
    }));
    const driverIconStyle = useAnimatedStyle(() => ({
        color: interpolateColor(roleAnimation.value, [0, 1], [colors.secondaryText, colors.primary])
    }));

    return (
        <>
            <View style={styles.header}>
                <Logo width={40} height={40} />
                
                {profile?.is_driver && (
                    <MotiView from={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'timing' }}>
                        <TouchableOpacity 
                            style={styles.switchRow} 
                            onPress={() => handleRoleSwitch(profile?.role !== 'driver')}
                            disabled={isSwitchingRole}
                            activeOpacity={0.8}
                        >
                            <Animated.View><Ionicons name="person-outline" size={18} style={passengerIconStyle} /></Animated.View>
                            {isSwitchingRole ? (
                                <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 6 }}/>
                            ) : (
                                <View pointerEvents="none">
                                    <Switch
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : colors.card}
                                        ios_backgroundColor={colors.border}
                                        value={profile.role === 'driver'}
                                    />
                                </View>
                            )}
                            <Animated.View><Ionicons name="car-sport-outline" size={18} style={driverIconStyle} /></Animated.View>
                        </TouchableOpacity>
                    </MotiView>
                )}

                <TouchableOpacity onPress={handleProfilePress}>
                    {loadingProfile ? (<View style={[styles.profilePic, styles.profilePlaceholder]}><ActivityIndicator size="small" color={colors.primary} /></View>) : userProfile?.avatar_url ? (<Image source={{ uri: userProfile.avatar_url }} style={styles.profilePic} contentFit="cover" />) : (<View style={[styles.profilePic, styles.profilePlaceholder]}><Ionicons name="person-outline" size={24} color={colors.secondaryText} /></View>)}
                </TouchableOpacity>
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'to' && styles.activeTab]} onPress={() => { setActiveTab('to'); setAirportSuggestions([]); }}><Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>{t('home.toAirport')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'from' && styles.activeTab]} onPress={() => { setActiveTab('from'); setAirportSuggestions([]); }}><Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>{t('home.fromAirport')}</Text></TouchableOpacity>
            </View>
            <Text style={styles.title}>{t('home.title')}</Text>
            <GradientCard>
                <View><InputRow ref={fromInputRef} icon={activeTab === 'to' ? 'home-outline' : 'airplane-outline'} placeholderKey={activeTab === 'to' ? 'home.fromPlaceholderAddress' : 'home.fromPlaceholder'} value={fromLocation} onChangeText={(text) => handleTextChange(text, 'fromLocation')} onClear={() => handleTextChange('', 'fromLocation')} onFocus={() => handleFocus('fromLocation')} onBlur={handleBlur} hasError={!!errors.fromLocation} /></View>
                <View style={styles.divider} />
                <View><InputRow ref={toInputRef} icon={activeTab === 'to' ? 'airplane-outline' : 'location-outline'} placeholderKey={activeTab === 'to' ? 'home.dropoffPlaceholderAirport' : 'home.dropoffPlaceholder'} value={toLocation} onChangeText={(text) => handleTextChange(text, 'toLocation')} onClear={() => handleTextChange('', 'toLocation')} onFocus={() => handleFocus('toLocation')} onBlur={handleBlur} hasError={!!errors.toLocation} /></View>
                <View style={styles.divider} />
                <View style={styles.detailsRow}>
                    <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('date')}><Text style={styles.detailLabel}>{t('home.dateLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{moment(selectedDate).format('DD.MM')}</Text><Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                    <View style={styles.verticalDivider} />
                    <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('time')}><Text style={styles.detailLabel}>{t('home.timeLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text><Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                    <View style={styles.verticalDivider} />
                    <TouchableOpacity style={styles.detailItem} onPress={() => setPassengerModalVisible(true)}><Text style={styles.detailLabel}>{t('home.passengersLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{totalPassengers}</Text><Ionicons name="people-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <InputRow icon="briefcase-outline" placeholderKey="home.luggagePlaceholder" value={luggageInfo} onChangeText={setLuggageInfo} onClear={() => setLuggageInfo('')} keyboardType="numeric" />
                <View style={styles.divider} />
                <View style={styles.flightInputContainer}>
                  <InputRow icon="barcode-outline" placeholderKey="home.flightNumberPlaceholder" value={flightNumber} onChangeText={(text) => setFlightNumber(text)} onClear={() => setFlightNumber('')} style={{ flex: 1, paddingVertical: 0 }} />
                  <TouchableOpacity onPress={() => Alert.alert(t('home.flightInfoTitle'), t('home.flightInfoMessage'))} style={styles.infoIcon}><Ionicons name="information-circle-outline" size={24} color={colors.secondaryText} /></TouchableOpacity>
                </View>
            </GradientCard>
            <View style={styles.radioGroupContainer}>
                <TouchableOpacity style={[styles.radioContainer, transferType === 'group' && styles.radioContainerActive]} onPress={() => setTransferType('group')}><GroupTransferIcon width={68} height={58} fill={transferType === 'group' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText, transferType === 'group' && styles.radioTextActive]}>{t('home.groupTransfer')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.radioContainer, transferType === 'individual' && styles.radioContainerActive]} onPress={() => setTransferType('individual')}><IndividualTransferIcon width={68} height={58} fill={transferType === 'individual' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText, transferType === 'individual' && styles.radioTextActive]}>{t('home.individualTransfer')}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}><Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} /><View style={styles.checkboxTextContainer}><Text style={styles.radioText}>{t('home.travelingWithPet')}</Text><Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text></View><Image source={Pet} style={styles.petImage} contentFit="contain" /></TouchableOpacity>
            <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setMeetWithSign(!meetWithSign)}><Ionicons name={meetWithSign ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} /><View style={styles.checkboxTextContainer}><Text style={styles.radioText}>{t('home.meetWithSign', 'Зустріти з табличкою')}</Text><Text style={styles.checkboxSubtext}>{t('home.signSubtext', 'Водій чекатиме з вашим іменем')}</Text></View><Ionicons name="person-add-outline" size={32} color={colors.secondaryText} style={styles.signIcon} /></TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleOrderPress} disabled={isSubmitting}>{isSubmitting ? (<ActivityIndicator color="#FFFFFF" />) : (<Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>)}</TouchableOpacity>
        </>
    );
});


// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function HomeScreen({ navigation }) {
    const { session, profile, switchRole } = useAuth();
    const { t, i18n } = useTranslation();
    
    const {
        fromLocation, setFromLocation, toLocation, setToLocation,
        flightNumber, setFlightNumber, luggageInfo, setLuggageInfo,
        activeTab, setActiveTab, transferType, setTransferType,
        withPet, setWithPet, meetWithSign, setMeetWithSign,
        selectedDate, setSelectedDate, passengerCounts, setPassengerCounts,
    } = useFormState();

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastTransferId, setLastTransferId] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isPickerVisible, setPickerVisibility] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isAuthModalVisible, setAuthModalVisible] = useState(false);
    const [isPassengerModalVisible, setPassengerModalVisible] = useState(false);
    const [isCommentModalVisible, setCommentModalVisible] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [airportSuggestions, setAirportSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeFieldForSuggestions, setActiveFieldForSuggestions] = useState(null);
    const [suggestionsPosition, setSuggestionsPosition] = useState(null);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const fromInputRef = useRef(null);
    const toInputRef = useRef(null);
    const blurTimeoutRef = useRef(null);
    
    const [isScreenVisible, setIsScreenVisible] = useState(false);
    useFocusEffect(
        useCallback(() => {
            setIsScreenVisible(true);
            return () => setIsScreenVisible(false);
        }, [])
    );

    const clearForm = useCallback(() => {
        setFromLocation(''); setToLocation(''); setFlightNumber('');
        setLuggageInfo(''); setWithPet(false); setMeetWithSign(false);
        setPassengerCounts({ adults: 1, children: 0, infants: 0 });
    }, [setFromLocation, setToLocation, setFlightNumber, setLuggageInfo, setWithPet, setMeetWithSign, setPassengerCounts]);

    useEffect(() => {
        const languageCode = i18n.language.split('-')[0];
        moment.locale(languageCode);
    }, [i18n.language]);

    const fetchProfile = useCallback(async () => {
        if (!session?.user) {
            setLoadingProfile(false);
            setUserProfile(null);
            return;
        }
        try {
            setLoadingProfile(true);
            const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
            if (error && error.code !== 'PGRST116') throw error;
            setUserProfile(data);
        } catch (error) { console.error("Error fetching profile:", error.message); } 
        finally { setLoadingProfile(false); }
    }, [session]);
    
    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const searchAirports = useCallback(async (text) => {
        if (text.length < 1) {
            setAirportSuggestions([]);
            return;
        }
        setIsSearching(true);
        try {
            const searchText = `%${text}%`;
            const { data, error } = await supabase.from('airports').select('name, city, country, iata_code').or(`name.ilike.${searchText},city.ilike.${searchText},iata_code.ilike.${searchText}`).limit(7);
            if (error) throw error;
            setAirportSuggestions(data || []);
        } catch (error) { console.error('Error searching airports:', error.message); } 
        finally { setIsSearching(false); }
    }, []);
    
    const isFieldForAirportSearch = useCallback((field) => (activeTab === 'to' && field === 'toLocation') || (activeTab === 'from' && field === 'fromLocation'), [activeTab]);
    
    const handleTextChange = useCallback((text, field) => {
        if (errors[field]) {
            setErrors(prevErrors => {
                const newErrors = { ...prevErrors };
                delete newErrors[field];
                return newErrors;
            });
        }
        const setterMap = { fromLocation: setFromLocation, toLocation: setToLocation };
        const setter = setterMap[field];
        if (setter) setter(text);
        if (isFieldForAirportSearch(field)) {
            setActiveFieldForSuggestions(field);
            searchAirports(text);
        }
    }, [errors, isFieldForAirportSearch, searchAirports, setFromLocation, setToLocation]);

    const onAirportSelect = useCallback((airport) => {
        const locationString = `${airport.city} (${airport.iata_code})`;
        const setter = activeFieldForSuggestions === 'fromLocation' ? setFromLocation : setToLocation;
        setter(locationString);
        setAirportSuggestions([]);
        setActiveFieldForSuggestions(null);
        setSuggestionsPosition(null);
    }, [activeFieldForSuggestions, setFromLocation, setToLocation]);
    
    const handleFocus = useCallback((field) => {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        const inputRef = field === 'fromLocation' ? fromInputRef : toInputRef;
        if (isFieldForAirportSearch(field)) {
            inputRef.current?.measureInWindow((x, y, width, height) => {
                setSuggestionsPosition({ top: y + height, left: x, width });
            });
            setActiveFieldForSuggestions(field);
            const location = field === 'fromLocation' ? fromLocation : toLocation;
            searchAirports(location);
        } else {
            setActiveFieldForSuggestions(null);
            setAirportSuggestions([]);
            setSuggestionsPosition(null);
        }
    }, [fromLocation, toLocation, isFieldForAirportSearch, searchAirports]);

    const handleBlur = useCallback(() => {
        blurTimeoutRef.current = setTimeout(() => {
            setActiveFieldForSuggestions(null);
            setAirportSuggestions([]);
            setSuggestionsPosition(null);
        }, 200);
    }, []);

    const validateForm = () => {
        const newErrors = {};
        if (!fromLocation.trim()) newErrors.fromLocation = true;
        if (!toLocation.trim()) newErrors.toLocation = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleOrderPress = useCallback(async () => {
        if (!validateForm()) return;
        if (!session) {
            setAuthModalVisible(true);
            return;
        }

        setIsSubmitting(true);
        const transferData = {
            passenger_id: session.user.id,
            from_location: fromLocation,
            to_location: toLocation,
            transfer_datetime: selectedDate.toISOString(),
            transfer_type: transferType,
            direction: activeTab === 'to' ? 'to_airport' : 'from_airport',
            adults_count: passengerCounts.adults,
            children_count: passengerCounts.children,
            infants_count: passengerCounts.infants,
            flight_number: flightNumber || null,
            luggage_info: luggageInfo || null,
            with_pet: withPet,
            meet_with_sign: meetWithSign,
        };

        try {
            const { data, error } = await supabase.from('transfers').insert([transferData]).select().single();
            if (error) throw error;
            setLastTransferId(data.id);
            setCommentModalVisible(true);
        } catch (error) {
            Alert.alert(t('errors.error'), t('errors.orderFailed'));
            console.error("Order creation error:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [session, fromLocation, toLocation, transferType, selectedDate, passengerCounts, flightNumber, luggageInfo, withPet, meetWithSign, activeTab]);

    const handleCommentSubmit = useCallback(async (comment) => {
        setCommentModalVisible(false);
        if (comment && lastTransferId) {
            try {
                const { error } = await supabase.from('transfers').update({ passenger_comment: comment }).eq('id', lastTransferId);
                if (error) throw error;
            } catch (error) { console.error("Error updating transfer with comment:", error.message); }
        }
        setSuccessModalVisible(true);
    }, [lastTransferId]);

    const handleCancelTransfer = useCallback(() => {
        Alert.alert(
            t('addCommentModal.cancelConfirmTitle'),
            t('addCommentModal.cancelConfirmMessage'),
            [
                { text: t('common.no'), style: 'cancel' },
                {
                    text: t('common.yes'),
                    style: 'destructive',
                    onPress: async () => {
                        setCommentModalVisible(false);
                        if (!lastTransferId) return;
                        try {
                            const { error } = await supabase.from('transfers').delete().eq('id', lastTransferId);
                            if (error) throw error;
                            Alert.alert(t('addCommentModal.cancelSuccessTitle'));
                            clearForm();
                        } catch(error) {
                            console.error("Error canceling transfer:", error.message);
                            Alert.alert(t('errors.error'), t('errors.cancelFailed'));
                        }
                    },
                },
            ]
        );
    }, [lastTransferId, t, clearForm]);

    const handleViewTransfers = useCallback(() => { setSuccessModalVisible(false); navigation.navigate('TransfersTab'); }, [navigation]);
    const handleProfilePress = useCallback(() => session?.user ? navigation.navigate('ProfileTab') : navigation.navigate('Auth'), [session, navigation]);
    
    const showPicker = useCallback((mode) => {
        setPickerMode(mode);
        setPickerVisibility(true);
    }, []);
    
    const handleConfirm = useCallback((date) => {
        setSelectedDate(date);
        setPickerVisibility(false);
    }, [setSelectedDate]);
    
    const handleRoleSwitch = useCallback(async (isDriver) => {
      const newRole = isDriver ? 'driver' : 'client';
      if (newRole === profile?.role) return;

      setIsSwitchingRole(true);
      const { success, error } = await switchRole(newRole);
      if (!success) {
        Alert.alert(t('common.error'), error);
        setIsSwitchingRole(false);
      }
    }, [switchRole, profile, t]);
    
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);

    return (
        <SafeAreaView style={styles.container}>
            <AuthPromptModal visible={isAuthModalVisible} onClose={() => setAuthModalVisible(false)} onLogin={() => { setAuthModalVisible(false); navigation.navigate('LoginScreen'); }} onRegister={() => { setAuthModalVisible(false); navigation.navigate('RegistrationScreen'); }} />
            <AddCommentModal visible={isCommentModalVisible} onClose={() => handleCommentSubmit('')} onCommentSubmit={handleCommentSubmit} onCancelTransfer={handleCancelTransfer} />
            <TransferSuccessModal visible={isSuccessModalVisible} onClose={() => setSuccessModalVisible(false)} onViewTransfers={handleViewTransfers} />
            <PassengerSelectorModal visible={isPassengerModalVisible} onClose={() => setPassengerModalVisible(false)} passengerCounts={passengerCounts} setPassengerCounts={setPassengerCounts} />
            <DateTimePickerModal 
                isVisible={isPickerVisible} 
                mode={pickerMode} 
                onConfirm={handleConfirm} 
                onCancel={() => setPickerVisibility(false)} 
                date={selectedDate}
                locale={i18n.language.split('-')[0]}
            />
            
            <MotiView 
              style={{ flex: 1 }}
              animate={{ opacity: isScreenVisible && !isSwitchingRole ? 1 : 0 }}
              transition={{ type: 'timing', duration: 300 }}
            >
                <FlatList
                    data={[]}
                    keyExtractor={() => 'main-content'}
                    ListHeaderComponent={
                        <HomeScreenContent
                            navigation={navigation} session={session} t={t} errors={errors}
                            fromLocation={fromLocation} toLocation={toLocation} flightNumber={flightNumber}
                            luggageInfo={luggageInfo} activeTab={activeTab} transferType={transferType}
                            withPet={withPet} meetWithSign={meetWithSign} selectedDate={selectedDate}
                            passengerCounts={passengerCounts} isSubmitting={isSubmitting} userProfile={userProfile}
                            loadingProfile={loadingProfile} 
                            handleProfilePress={handleProfilePress}
                            setActiveTab={setActiveTab} setAirportSuggestions={setAirportSuggestions}
                            handleTextChange={handleTextChange} handleFocus={handleFocus} handleBlur={handleBlur}
                            showPicker={showPicker} setPassengerModalVisible={setPassengerModalVisible}
                            setLuggageInfo={setLuggageInfo} setFlightNumber={setFlightNumber}
                            setTransferType={setTransferType} setWithPet={setWithPet}
                            setMeetWithSign={setMeetWithSign} handleOrderPress={handleOrderPress}
                            handleRoleSwitch={handleRoleSwitch} isSwitchingRole={isSwitchingRole}
                            fromInputRef={fromInputRef} toInputRef={toInputRef}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                />
            </MotiView>
            
            {activeFieldForSuggestions && suggestionsPosition && (
                <AirportSuggestionsList
                    suggestions={airportSuggestions}
                    onSelect={onAirportSelect}
                    style={{
                        position: 'absolute',
                        top: suggestionsPosition.top,
                        left: suggestionsPosition.left,
                        width: suggestionsPosition.width,
                    }}
                />
            )}
        </SafeAreaView>
    );
}