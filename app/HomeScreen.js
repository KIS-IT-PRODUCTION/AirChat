import React, { useState, useEffect, useCallback, createContext, useContext, useRef, forwardRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';

import Logo from '../assets/icon.svg';
import GroupTransferIcon from '../assets/group.svg';
import IndividualTransferIcon from '../assets/induvidual.svg';
import Pet from '../assets/pets.png';

// --- Constants ---
const UKRAINE_REGIONS = [ "Вінницька область", "Волинська область", "Дніпропетровська область", "Донецька область", "Житомирська область", "Закарпатська область", "Запорізька область", "Івано-Франківська область", "Київська область", "Кіровоградська область", "Луганська область", "Львівська область", "Миколаївська область", "Одеська область", "Полтавська область", "Рівненська область", "Сумська область", "Тернопільська область", "Харківська область", "Херсонська область", "Хмельницька область", "Черкаська область", "Чернівецька область", "Чернігівська область" ];

// --- FormContext та Provider ---
const FormContext = createContext();

export const FormProvider = ({ children }) => {
    const [fromLocation, setFromLocation] = useState({ fullText: '', city: '', region: '', country: '' });
    const [toLocation, setToLocation] = useState({ fullText: '', city: '', region: '', country: '' });
    const [flightNumber, setFlightNumber] = useState('');
    const [luggageInfo, setLuggageInfo] = useState('');
    const [activeTab, setActiveTab] = useState('to');
    const [transferType, setTransferType] = useState('individual');
    const [withPet, setWithPet] = useState(false);
    const [meetWithSign, setMeetWithSign] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [passengerCounts, setPassengerCounts] = useState({ adults: 1, children: 0, infants: 0 });

    const value = {
        fromLocation, setFromLocation, toLocation, setToLocation, flightNumber, setFlightNumber,
        luggageInfo, setLuggageInfo, activeTab, setActiveTab, transferType, setTransferType,
        withPet, setWithPet, meetWithSign, setMeetWithSign, selectedDate, setSelectedDate,
        passengerCounts, setPassengerCounts,
    };

    return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};

export const useFormState = () => useContext(FormContext);

// --- СТИЛІ ---
const shadowStyle = { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 };
const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    scrollContent: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingHorizontal: 15, paddingTop: 16 },
    profilePic: { width: 40, height: 40, borderRadius: 20 },
    profilePlaceholder: { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: 40, height: 40, borderRadius: 20 },
    roleSwitcher: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 20, padding: 4, ...shadowStyle, position: 'relative' },
    roleOption: { padding: 8, borderRadius: 16, zIndex: 1, width: 40, alignItems: 'center', justifyContent: 'center' },
    rolePill: { position: 'absolute', top: 4, bottom: 4, left: 4, width: 40, backgroundColor: colors.primary, borderRadius: 16 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 24, marginHorizontal: 15, ...(theme === 'light' ? shadowStyle : {}) },
    tab: { flex: 1, paddingVertical: 16, borderRadius: 8 },
    activeTab: { backgroundColor: colors.primary },
    tabText: { color: colors.text, textAlign: 'center', fontWeight: '600', fontSize: 14 },
    activeTabText: { color: '#FFFFFF' },
    title: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16, paddingHorizontal: 15 },
    card: { backgroundColor: colors.card, borderRadius: 20, marginBottom: 16, marginHorizontal: 15, ...(theme === 'light' ? shadowStyle : {}) },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Platform.OS === 'ios' ? 4 : 0, paddingHorizontal: 16, borderWidth: 1.5, borderColor: 'transparent', },
    errorHighlight: { borderColor: '#FFC700', backgroundColor: theme === 'light' ? 'rgba(255, 199, 0, 0.1)' : 'rgba(255, 199, 0, 0.15)' },
    textInput: { color: colors.text, fontSize: 16, marginLeft: 12, flex: 1, height: 50 },
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
    flightInputContainer: { flexDirection: 'row', alignItems: 'center' },
    infoIcon: { paddingLeft: 20, paddingVertical: 14, paddingRight: 10 },
    signIcon: { width: 40, height: 40, textAlign: 'center' },
    passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    passengerLabel: { color: colors.text, fontSize: 18, fontWeight: '600' },
    passengerSublabel: { color: colors.secondaryText, fontSize: 13 },
    passengerCounter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    passengerCountText: { color: colors.text, fontSize: 22, fontWeight: 'bold', minWidth: 30, textAlign: 'center' },
});

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---
const RoleSwitcher = ({ role, onSwitch, isSwitching }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    const isDriver = role === 'driver';
    const switchValue = useSharedValue(isDriver ? 1 : 0);

    useEffect(() => {
        switchValue.value = withSpring(isDriver ? 1 : 0, { damping: 15, stiffness: 120 });
    }, [isDriver]);

    const pillStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: switchValue.value * 48 }], // 48 = width (40) + horizontal padding (4+4)
    }));

    const passengerIconStyle = useAnimatedStyle(() => ({
        color: interpolateColor(switchValue.value, [0, 1], ['#FFFFFF', colors.secondaryText]),
    }));

    const driverIconStyle = useAnimatedStyle(() => ({
        color: interpolateColor(switchValue.value, [0, 1], [colors.secondaryText, '#FFFFFF']),
    }));

    if (isSwitching) {
        return (
            <View style={[styles.roleSwitcher, { paddingHorizontal: 28, paddingVertical: 12 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.roleSwitcher}>
            <Animated.View style={[styles.rolePill, pillStyle]} />
            
            <TouchableOpacity style={styles.roleOption} onPress={() => onSwitch(false)} disabled={!isDriver}>
                <Animated.View>
                    <Ionicons name="person-outline" size={20} style={passengerIconStyle} />
                </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.roleOption} onPress={() => onSwitch(true)} disabled={isDriver}>
                <Animated.View>
                    <Ionicons name="car-sport-outline" size={20} style={driverIconStyle} />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const AnimatedBlock = ({ children, delay }) => (
    <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay }}
    >
        {children}
    </MotiView>
);

const AuthPromptModal = ({ visible, onClose, onLogin, onRegister }) => {
    const { colors, theme } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors, theme);
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Text style={styles.modalTitle}>{t('authPrompt.title')}</Text><Text style={styles.modalSubtitle}>{t('authPrompt.subtitle')}</Text><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onRegister}><Text style={styles.modalSecondaryButtonText}>{t('auth.register')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={onLogin}><Text style={styles.modalPrimaryButtonText}>{t('auth.login')}</Text></TouchableOpacity></View></View></View></Modal>);
};
const AddCommentModal = ({ visible, onClose, onCommentSubmit, onCancelTransfer }) => {
    const { colors, theme } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors, theme); const [comment, setComment] = useState('');
    const handleSendComment = () => { onCommentSubmit(comment); };
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><Pressable style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Ionicons name="pencil-outline" size={48} color={colors.primary} style={{ marginBottom: 16 }} /><Text style={styles.modalTitle}>{t('addCommentModal.title')}</Text><Text style={styles.modalSubtitle}>{t('addCommentModal.subtitle')}</Text><TextInput style={styles.modalCommentInput} placeholder={t('addCommentModal.commentPlaceholder')} placeholderTextColor={colors.secondaryText} value={comment} onChangeText={setComment} multiline /><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('addCommentModal.skipButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={handleSendComment}><Text style={styles.modalPrimaryButtonText}>{t('addCommentModal.sendButton')}</Text></TouchableOpacity></View><TouchableOpacity style={styles.modalDestructiveButton} onPress={onCancelTransfer}><Text style={styles.modalDestructiveButtonText}>{t('addCommentModal.cancelTransfer')}</Text></TouchableOpacity></Pressable></KeyboardAvoidingView></Modal>);
};
const TransferSuccessModal = ({ visible, onClose, onViewTransfers }) => {
    const { colors, theme } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors, theme);
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><Ionicons name="checkmark-circle-outline" size={64} color={'#4CAF50'} style={{marginBottom: 16}} /><Text style={styles.modalTitle}>{t('transferSuccess.title')}</Text><Text style={styles.modalSubtitle}>{t('transferSuccess.subtitle')}</Text><View style={{width: '100%'}}><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onViewTransfers}><Text style={styles.modalPrimaryButtonText}>{t('transferSuccess.viewTransfersButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalFullWidthSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('transferSuccess.closeButton')}</Text></TouchableOpacity></View></View></View></Modal>);
};
const PassengerSelectorModal = ({ visible, onClose, passengerCounts, setPassengerCounts }) => {
    const { colors, theme } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors, theme);
    const updateCount = (type, amount) => setPassengerCounts(prev => ({ ...prev, [type]: Math.max(type === 'adults' ? 1 : 0, prev[type] + amount) }));
    const PassengerRow = ({ label, sublabel, count, onUpdate, minCount = 0 }) => {
        return (<View style={styles.passengerRow}><View><Text style={styles.passengerLabel}>{label}</Text><Text style={styles.passengerSublabel}>{sublabel}</Text></View><View style={styles.passengerCounter}><TouchableOpacity onPress={() => onUpdate(-1)} disabled={count <= minCount}><Ionicons name="remove-circle" size={32} color={count <= minCount ? colors.border : colors.primary} /></TouchableOpacity><Text style={styles.passengerCountText}>{count}</Text><TouchableOpacity onPress={() => onUpdate(1)}><Ionicons name="add-circle" size={32} color={colors.primary} /></TouchableOpacity></View></View>);
    };
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={styles.modalContent}><Text style={styles.modalTitle}>{t('passengers.title')}</Text><PassengerRow label={t('passengers.adults')} sublabel={t('passengers.adultsAge')} count={passengerCounts.adults} onUpdate={(amount) => updateCount('adults', amount)} minCount={1} /><PassengerRow label={t('passengers.children')} sublabel={t('passengers.childrenAge')} count={passengerCounts.children} onUpdate={(amount) => updateCount('children', amount)} /><PassengerRow label={t('passengers.infants')} sublabel={t('passengers.infantsAge')} count={passengerCounts.infants} onUpdate={(amount) => updateCount('infants', amount)} /><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onClose}><Text style={styles.modalPrimaryButtonText}>{t('common.done')}</Text></TouchableOpacity></Pressable></Pressable></Modal>);
};
const GradientCard = ({ children, style }) => {
    const { colors, theme } = useTheme(); const styles = getStyles(colors, theme);
    const gradientColors = theme === 'light' ? ['#FFFFFF', '#F7F7F7'] : [colors.card, '#2C2C2E'];
    return (<LinearGradient colors={gradientColors} style={[styles.card, style]}>{children}</LinearGradient>);
};

const InputRow = forwardRef(({ icon, placeholderKey, value, onChangeText, onClear, style, keyboardType, hasError }, ref) => {
    const { colors, theme } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors, theme);
    return (<View ref={ref} style={[styles.inputRow, style, hasError && styles.errorHighlight]}><Ionicons name={icon} size={20} color={colors.secondaryText} /><TextInput placeholder={t(placeholderKey)} placeholderTextColor={colors.secondaryText} style={styles.textInput} value={value} onChangeText={onChangeText} keyboardType={keyboardType || 'default'} />{value?.length > 0 && (<TouchableOpacity onPress={onClear} style={styles.clearIcon}><Ionicons name="close-circle" size={20} color={colors.secondaryText} /></TouchableOpacity>)}</View>);
});

// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function HomeScreen({ navigation }) {
    const { session, profile, switchRole } = useAuth();
    const { t, i18n } = useTranslation();
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    
    const {
        fromLocation, setFromLocation, toLocation, setToLocation, flightNumber, setFlightNumber, luggageInfo, setLuggageInfo,
        activeTab, setActiveTab, transferType, setTransferType, withPet, setWithPet, meetWithSign, setMeetWithSign,
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
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [isScreenVisible, setIsScreenVisible] = useState(false);

    useFocusEffect(useCallback(() => { setIsScreenVisible(true); return () => setIsScreenVisible(false); }, []));
    useEffect(() => { const languageCode = i18n.language.split('-')[0]; moment.locale(languageCode); }, [i18n.language]);
    useEffect(() => { fetchProfile(); }, [session]);
    useEffect(() => { setIsSwitchingRole(false); }, [profile?.role]);

    const fetchProfile = useCallback(async () => {
        if (!session?.user) { setLoadingProfile(false); setUserProfile(null); return; }
        setLoadingProfile(true);
        try {
            const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
            if (error && error.code !== 'PGRST116') throw error; setUserProfile(data);
        } catch (error) { console.error("Error fetching profile:", error.message); } finally { setLoadingProfile(false); }
    }, [session]);

    const clearForm = useCallback(() => {
        setFromLocation({ fullText: '', city: '', region: '', country: '' });
        setToLocation({ fullText: '', city: '', region: '', country: '' });
        setFlightNumber(''); setLuggageInfo(''); setWithPet(false); setMeetWithSign(false);
        setPassengerCounts({ adults: 1, children: 0, infants: 0 });
        setErrors({});
    }, [setFromLocation, setToLocation, setFlightNumber, setLuggageInfo, setWithPet, setMeetWithSign, setPassengerCounts]);
    
    const handleTextChange = useCallback((text, field) => {
        const setter = field === 'fromLocation' ? setFromLocation : setToLocation;
        setter({ fullText: text, city: '', region: '', country: '' });
        
        if (errors[field]) {
            setErrors(prevErrors => { const newErrors = { ...prevErrors }; delete newErrors[field]; return newErrors; });
        }
    }, [errors, setFromLocation, setToLocation]);

    const validateForm = () => {
        const newErrors = {};
        if (!fromLocation.fullText.trim()) newErrors.fromLocation = true;
        if (!toLocation.fullText.trim()) newErrors.toLocation = true;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleOrderPress = useCallback(async () => {
        if (!validateForm()) return;
        if (!session) { setAuthModalVisible(true); return; }

        setIsSubmitting(true);
        
        const getRegionFromName = (text) => {
            const lowercasedText = text.toLowerCase();
            for (const region of UKRAINE_REGIONS) {
                const regionPart = region.split(' ')[0].toLowerCase().slice(0, -2);
                if (lowercasedText.includes(regionPart)) {
                    return region;
                }
            }
            return '';
        };

        const isAirportRegex = /\b[A-Z]{3}\b/;
        const isFromAirport = activeTab === 'from' || isAirportRegex.test(fromLocation.fullText);
        const isToAirport = activeTab === 'to' || isAirportRegex.test(toLocation.fullText);
        
        const transferData = {
            passenger_id: session.user.id,
            from_location: fromLocation.fullText,
            to_location: toLocation.fullText,
            from_city: fromLocation.fullText.split(',')[0].trim(),
            from_region: isFromAirport ? '' : getRegionFromName(fromLocation.fullText),
            from_country: isFromAirport ? '' : 'Україна',
            to_city: toLocation.fullText.split(',')[0].trim(),
            to_region: isToAirport ? '' : getRegionFromName(toLocation.fullText),
            to_country: isToAirport ? '' : 'Україна',
            transfer_datetime: selectedDate.toISOString(),
            transfer_type: transferType,
            direction: activeTab === 'to' ? 'to_airport' : 'from_airport',
            adults_count: passengerCounts.adults, children_count: passengerCounts.children, infants_count: passengerCounts.infants,
            flight_number: flightNumber || null, luggage_info: luggageInfo || null, with_pet: withPet, meet_with_sign: meetWithSign,
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
    }, [session, fromLocation, toLocation, transferType, selectedDate, passengerCounts, flightNumber, luggageInfo, withPet, meetWithSign, activeTab, t]);
    
    const handleCommentSubmit = useCallback(async (comment) => {
        setCommentModalVisible(false);
        if (comment && lastTransferId) {
            try { await supabase.from('transfers').update({ passenger_comment: comment }).eq('id', lastTransferId); } 
            catch (error) { console.error("Error updating transfer with comment:", error.message); }
        }
        setSuccessModalVisible(true);
    }, [lastTransferId]);

    const handleCancelTransfer = useCallback(() => {
        Alert.alert(t('addCommentModal.cancelConfirmTitle'), t('addCommentModal.cancelConfirmMessage'),
            [{ text: t('common.no'), style: 'cancel' }, { text: t('common.yes'), style: 'destructive',
                onPress: async () => {
                    setCommentModalVisible(false); if (!lastTransferId) return;
                    try { const { error } = await supabase.from('transfers').delete().eq('id', lastTransferId); if (error) throw error;
                        Alert.alert(t('addCommentModal.cancelSuccessTitle')); clearForm();
                    } catch(error) { console.error("Error canceling transfer:", error.message); Alert.alert(t('errors.error'), t('errors.cancelFailed')); }
                },
            }]
        );
    }, [lastTransferId, t, clearForm]);
    
    const handleRoleSwitch = useCallback(async (isDriver) => {
      const newRole = isDriver ? 'driver' : 'client'; if (newRole === profile?.role) return;
      setIsSwitchingRole(true); const { success, error } = await switchRole(newRole);
      if (!success) { Alert.alert(t('common.error'), error.message); setIsSwitchingRole(false); }
    }, [switchRole, profile, t]);
    
    const totalPassengers = passengerCounts.adults + passengerCounts.children + passengerCounts.infants;

    return (
        <SafeAreaView style={styles.container}>
            <AuthPromptModal visible={isAuthModalVisible} onClose={() => setAuthModalVisible(false)} onLogin={() => { setAuthModalVisible(false); navigation.navigate('LoginScreen'); }} onRegister={() => { setAuthModalVisible(false); navigation.navigate('RegistrationScreen'); }} />
            <AddCommentModal visible={isCommentModalVisible} onClose={() => handleCommentSubmit('')} onCommentSubmit={handleCommentSubmit} onCancelTransfer={handleCancelTransfer} />
            <TransferSuccessModal visible={isSuccessModalVisible} onClose={() => { setSuccessModalVisible(false); clearForm(); } } onViewTransfers={() => navigation.navigate('TransfersTab')} />
            <PassengerSelectorModal visible={isPassengerModalVisible} onClose={() => setPassengerModalVisible(false)} passengerCounts={passengerCounts} setPassengerCounts={setPassengerCounts} />
            <DateTimePickerModal isVisible={isPickerVisible} mode={pickerMode} onConfirm={(d) => {setSelectedDate(d); setPickerVisibility(false);}} onCancel={() => setPickerVisibility(false)} date={selectedDate} locale={i18n.language.split('-')[0]} />
            
            {isScreenVisible && (
                <FlatList
                    data={[]} keyExtractor={() => 'main-content'} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} ListHeaderComponent={
                        <>
                           <AnimatedBlock delay={0}>
                                <View style={styles.header}>
                                    <Logo width={40} height={40} />
                                    {profile?.is_driver && (
                                        <RoleSwitcher 
                                            role={profile.role}
                                            onSwitch={handleRoleSwitch}
                                            isSwitching={isSwitchingRole}
                                        />
                                    )}
                                    <TouchableOpacity onPress={() => session?.user ? navigation.navigate('ProfileTab') : navigation.navigate('Auth')}>
                                        {loadingProfile ? <ActivityIndicator/> : userProfile?.avatar_url ? <Image source={{ uri: userProfile.avatar_url }} style={styles.profilePic} /> : <View style={styles.profilePlaceholder}><Ionicons name="person-outline" size={24} color={colors.secondaryText} /></View>}
                                    </TouchableOpacity>
                                </View>
                            </AnimatedBlock>

                            <AnimatedBlock delay={100}>
                                <View style={styles.tabContainer}>
                                    <TouchableOpacity style={[styles.tab, activeTab === 'to' && styles.activeTab]} onPress={() => setActiveTab('to')}><Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>{t('home.toAirport')}</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.tab, activeTab === 'from' && styles.activeTab]} onPress={() => setActiveTab('from')}><Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>{t('home.fromAirport')}</Text></TouchableOpacity>
                                </View>
                            </AnimatedBlock>
                            
                            <AnimatedBlock delay={200}>
                                <Text style={styles.title}>{t('home.title')}</Text>
                            </AnimatedBlock>

                            <AnimatedBlock delay={300}>
                                <GradientCard>
                                    <InputRow icon={activeTab === 'to' ? 'home-outline' : 'airplane-outline'} placeholderKey={activeTab === 'to' ? 'home.fromPlaceholderAddress' : 'home.fromPlaceholder'} value={fromLocation.fullText} onChangeText={(text) => handleTextChange(text, 'fromLocation')} onClear={() => handleTextChange('', 'fromLocation')} hasError={!!errors.fromLocation} />
                                    <View style={styles.divider} />
                                    <InputRow icon={activeTab === 'to' ? 'airplane-outline' : 'location-outline'} placeholderKey={activeTab === 'to' ? 'home.dropoffPlaceholderAirport' : 'home.dropoffPlaceholder'} value={toLocation.fullText} onChangeText={(text) => handleTextChange(text, 'toLocation')} onClear={() => handleTextChange('', 'toLocation')} hasError={!!errors.toLocation} />
                                    <View style={styles.divider} />
                                    <View style={styles.detailsRow}>
                                        <TouchableOpacity style={styles.detailItem} onPress={() => {setPickerMode('date'); setPickerVisibility(true);}}><Text style={styles.detailLabel}>{t('home.dateLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{moment(selectedDate).format('DD.MM')}</Text><Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                                        <View style={styles.verticalDivider} />
                                        <TouchableOpacity style={styles.detailItem} onPress={() => {setPickerMode('time'); setPickerVisibility(true);}}><Text style={styles.detailLabel}>{t('home.timeLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text><Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                                        <View style={styles.verticalDivider} />
                                        <TouchableOpacity style={styles.detailItem} onPress={() => setPassengerModalVisible(true)}><Text style={styles.detailLabel}>{t('home.passengersLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{totalPassengers}</Text><Ionicons name="people-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                                    </View>
                                    <View style={styles.divider} />
                                    <InputRow icon="briefcase-outline" placeholderKey="home.luggagePlaceholder" value={luggageInfo} onChangeText={setLuggageInfo} onClear={() => setLuggageInfo('')} keyboardType="numeric" />
                                    <View style={styles.divider} />
                                    <View style={styles.flightInputContainer}>
                                      <InputRow icon="barcode-outline" placeholderKey="home.flightNumberPlaceholder" value={flightNumber} onChangeText={(text) => setFlightNumber(text.toUpperCase())} onClear={() => setFlightNumber('')} style={{ flex: 1 }} />
                                      <TouchableOpacity onPress={() => Alert.alert(t('home.flightInfoTitle'), t('home.flightInfoMessage'))} style={styles.infoIcon}><Ionicons name="information-circle-outline" size={24} color={colors.secondaryText} /></TouchableOpacity>
                                    </View>
                                </GradientCard>
                            </AnimatedBlock>
                            
                            <AnimatedBlock delay={400}>
                                <View style={styles.radioGroupContainer}>
                                    <TouchableOpacity style={[styles.radioContainer, transferType === 'group' && styles.radioContainerActive]} onPress={() => setTransferType('group')}><GroupTransferIcon width={68} height={58} fill={transferType === 'group' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText, transferType === 'group' && styles.radioTextActive]}>{t('home.groupTransfer')}</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.radioContainer, transferType === 'individual' && styles.radioContainerActive]} onPress={() => setTransferType('individual')}><IndividualTransferIcon width={68} height={58} fill={transferType === 'individual' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText, transferType === 'individual' && styles.radioTextActive]}>{t('home.individualTransfer')}</Text></TouchableOpacity>
                                </View>
                            </AnimatedBlock>
                            
                            <AnimatedBlock delay={500}>
                                <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}><Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} /><View style={styles.checkboxTextContainer}><Text style={styles.radioText}>{t('home.travelingWithPet')}</Text><Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text></View><Image source={Pet} style={styles.petImage} contentFit="contain" /></TouchableOpacity>
                            </AnimatedBlock>
                           
                            <AnimatedBlock delay={600}>
                                <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setMeetWithSign(!meetWithSign)}><Ionicons name={meetWithSign ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} /><View style={styles.checkboxTextContainer}><Text style={styles.radioText}>{t('home.meetWithSign', 'Зустріти з табличкою')}</Text><Text style={styles.checkboxSubtext}>{t('home.signSubtext', 'Водій чекатиме з вашим іменем')}</Text></View><Ionicons name="person-add-outline" size={32} color={colors.secondaryText} style={styles.signIcon} /></TouchableOpacity>
                            </AnimatedBlock>
                            
                            <AnimatedBlock delay={700}>
                                <TouchableOpacity style={styles.submitButton} onPress={handleOrderPress} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>}</TouchableOpacity>
                            </AnimatedBlock>
                        </>
                    }
                />
            )}
        </SafeAreaView>
    );
}