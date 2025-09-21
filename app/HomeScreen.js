import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  TextInput, Modal, Pressable, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import _ from 'lodash';

// --- ІМПОРТИ ВАШИХ ЛОКАЛЬНИХ ФАЙЛІВ ---
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import GroupTransferIcon from '../assets/group.svg';
import IndividualTransferIcon from '../assets/induvidual.svg';
import Pet from '../assets/pets.png';

// --- ДОПОМІЖНІ КОМПОНЕНТИ ---

const AuthPromptModal = ({ visible, onClose, onLogin, onRegister }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (<Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Text style={styles.modalTitle}>{t('authPrompt.title')}</Text><Text style={styles.modalSubtitle}>{t('authPrompt.subtitle')}</Text><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onRegister}><Text style={styles.modalSecondaryButtonText}>{t('auth.register')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={onLogin}><Text style={styles.modalPrimaryButtonText}>{t('auth.login')}</Text></TouchableOpacity></View></View></View></Modal>);
};

const AddCommentModal = ({ visible, onClose, onCommentSubmit }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    const [comment, setComment] = useState('');
    const handleSendComment = () => { onCommentSubmit(comment); };
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
                <Pressable style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity>
                    <Text style={styles.modalTitle}>{t('addCommentModal.title')}</Text>
                    <Text style={styles.modalSubtitle}>{t('addCommentModal.subtitle')}</Text>
                    <TextInput style={styles.modalCommentInput} placeholder={t('addCommentModal.commentPlaceholder')} placeholderTextColor={colors.secondaryText} value={comment} onChangeText={setComment} multiline />
                    <View style={styles.modalButtonRow}>
                        <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('addCommentModal.skipButton')}</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalRowPrimaryButton} onPress={handleSendComment}><Text style={styles.modalPrimaryButtonText}>{t('addCommentModal.sendButton')}</Text></TouchableOpacity>
                    </View>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const TransferSuccessModal = ({ visible, onClose, onViewTransfers }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><View style={styles.successIconContainer}><Ionicons name="checkmark-circle-outline" size={64} color={'#4CAF50'} /></View><Text style={styles.modalTitle}>{t('transferSuccess.title')}</Text><Text style={styles.modalSubtitle}>{t('transferSuccess.subtitle')}</Text><View style={styles.modalButtonColumn}><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onViewTransfers}><Text style={styles.modalPrimaryButtonText}>{t('transferSuccess.viewTransfersButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalFullWidthSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('transferSuccess.closeButton')}</Text></TouchableOpacity></View></View></View></Modal> );
};

const InputRow = ({ icon, placeholderKey, value, onChangeText, style, onFocus, onBlur }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (
        <View style={[styles.inputRow, style]}>
            <Ionicons name={icon} size={20} color={colors.secondaryText} />
            <TextInput
                placeholder={t(placeholderKey)}
                placeholderTextColor={colors.secondaryText}
                style={styles.textInput}
                value={value}
                onChangeText={onChangeText}
                onFocus={onFocus}
                onBlur={onBlur}
            />
        </View>
    );
};

const PassengerRow = ({ label, sublabel, count, onUpdate, minCount = 0 }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    return (
        <View style={styles.passengerRow}>
            <View>
                <Text style={styles.passengerLabel}>{label}</Text>
                <Text style={styles.passengerSublabel}>{sublabel}</Text>
            </View>
            <View style={styles.passengerCounter}>
                <TouchableOpacity onPress={() => onUpdate(-1)} disabled={count <= minCount}>
                    <Ionicons name="remove-circle" size={32} color={count <= minCount ? colors.border : colors.primary} />
                </TouchableOpacity>
                <Text style={styles.passengerCountText}>{count}</Text>
                <TouchableOpacity onPress={() => onUpdate(1)}>
                    <Ionicons name="add-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const PassengerSelectorModal = ({ visible, onClose, passengerCounts, setPassengerCounts }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    const updateCount = (type, amount) => { setPassengerCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] + amount) })); };
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{t('passengers.title')}</Text>
                    <PassengerRow label={t('passengers.adults')} sublabel={t('passengers.adultsAge')} count={passengerCounts.adults} onUpdate={(amount) => updateCount('adults', amount)} minCount={1} />
                    <PassengerRow label={t('passengers.children')} sublabel={t('passengers.childrenAge')} count={passengerCounts.children} onUpdate={(amount) => updateCount('children', amount)} />
                    <PassengerRow label={t('passengers.infants')} sublabel={t('passengers.infantsAge')} count={passengerCounts.infants} onUpdate={(amount) => updateCount('infants', amount)} />
                    <TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onClose}><Text style={styles.modalPrimaryButtonText}>{t('common.done')}</Text></TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

// UI ОНОВЛЕННЯ: Новий компонент для красивого списку пропозицій
const AirportSuggestionsList = ({ suggestions, onSelect, style }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    return (
       
        <View style={[styles.suggestionsContainer, style]}>
            {suggestions.map((item) => (
                <TouchableOpacity key={item.iata_code} onPress={() => onSelect(item)} style={styles.suggestionItem}>
                    <Ionicons name="airplane-outline" size={24} color={colors.primary} />
                    <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionCity}>{`${item.city} (${item.iata_code})`}</Text>
                        <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
};


// --- ОСНОВНИЙ КОМПОНЕНТ ---
export default function HomeScreen({ navigation }) {
    const { colors, theme } = useTheme();
    const { session } = useAuth();
    const { t, i18n } = useTranslation();
    
    // --- State Management ---
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastTransferId, setLastTransferId] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    
    // Modals visibility
    const [isPickerVisible, setPickerVisibility] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isAuthModalVisible, setAuthModalVisible] = useState(false);
    const [isPassengerModalVisible, setPassengerModalVisible] = useState(false);
    const [isCommentModalVisible, setCommentModalVisible] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    
    // Airport Search State
    const [airportSuggestions, setAirportSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeFieldForSuggestions, setActiveFieldForSuggestions] = useState(null);

    useEffect(() => {
        moment.locale(i18n.language);
    }, [i18n.language]);

    const totalPassengers = passengerCounts.adults + passengerCounts.children + passengerCounts.infants;

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
        } catch (error) {
            console.error("Error fetching profile:", error.message);
        } finally {
            setLoadingProfile(false);
        }
    }, [session]);
    
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // --- Airport Search Logic ---
    const searchAirports = async (text) => {
        if (text.length < 2) {
            setAirportSuggestions([]);
            return;
        }
        setIsSearching(true);
        try {
            const searchText = `%${text}%`;
            const { data, error } = await supabase
                .from('airports')
                .select('name, city, country, iata_code')
                .or(`name.ilike.${searchText},city.ilike.${searchText},iata_code.ilike.${searchText}`)
                .limit(7);
            if (error) throw error;
            setAirportSuggestions(data || []);
        } catch (error) {
            console.error('Error searching airports:', error.message);
        } finally {
            setIsSearching(false);
        }
    };
    
    const debouncedSearch = useCallback(_.debounce(searchAirports, 300), []);
    
    const handleTextChange = (text, field) => {
        field === 'from' ? setFromLocation(text) : setToLocation(text);
        const isAirportField = (activeTab === 'to' && field === 'to') || (activeTab === 'from' && field === 'from');
        if (isAirportField) {
            setActiveFieldForSuggestions(field);
            debouncedSearch(text);
        } else {
            setActiveFieldForSuggestions(null);
            setAirportSuggestions([]);
        }
    };

    const onAirportSelect = (airport) => {
        const locationString = `${airport.city} (${airport.iata_code})`;
        activeFieldForSuggestions === 'from' ? setFromLocation(locationString) : setToLocation(locationString);
        setAirportSuggestions([]);
        setActiveFieldForSuggestions(null);
    };
    
    const handleFocus = (field) => {
        const isAirportField = (activeTab === 'to' && field === 'to') || (activeTab === 'from' && field === 'from');
        if (isAirportField) {
            setActiveFieldForSuggestions(field);
            const location = field === 'from' ? fromLocation : toLocation;
            if (location.length > 1) {
                debouncedSearch(location);
            }
        } else {
            setActiveFieldForSuggestions(null);
            setAirportSuggestions([]);
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            setAirportSuggestions([]);
            setActiveFieldForSuggestions(null);
        }, 200); // Затримка, щоб дозволити спрацювати onPress на елементі списку
    };

    // --- Other Handlers ---
    const handleOrderPress = async () => { /* ...логіка без змін... */ };
    const handleCommentSubmit = async (comment) => { /* ...логіка без змін... */ };
    const handleViewTransfers = () => { setSuccessModalVisible(false); navigation.navigate('TransfersTab'); };
    const handleProfilePress = () => session?.user ? navigation.navigate('ProfileTab') : navigation.navigate('Auth');
    const showPicker = (mode) => { setPickerMode(mode); setPickerVisibility(true); };
    const handleConfirm = (date) => { setSelectedDate(date); setPickerVisibility(false); };
    
    const styles = getStyles(colors, theme);

    return (
        <SafeAreaView style={styles.container}>
            {/* --- Modals --- */}
            <AuthPromptModal visible={isAuthModalVisible} onClose={() => setAuthModalVisible(false)} onLogin={() => { setAuthModalVisible(false); navigation.navigate('LoginScreen'); }} onRegister={() => { setAuthModalVisible(false); navigation.navigate('RegistrationScreen'); }} />
            <AddCommentModal visible={isCommentModalVisible} onClose={() => handleCommentSubmit('')} onCommentSubmit={handleCommentSubmit} />
            <TransferSuccessModal visible={isSuccessModalVisible} onClose={() => setSuccessModalVisible(false)} onViewTransfers={handleViewTransfers} />
            <PassengerSelectorModal visible={isPassengerModalVisible} onClose={() => setPassengerModalVisible(false)} passengerCounts={passengerCounts} setPassengerCounts={setPassengerCounts} />
            <DateTimePickerModal isVisible={isPickerVisible} mode={pickerMode} onConfirm={handleConfirm} onCancel={() => setPickerVisibility(false)} date={selectedDate} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Logo width={50} height={50} />
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Support')}>
                            <Ionicons name="headset-outline" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleProfilePress}>
                            {loadingProfile ? (
                                <View style={[styles.profilePic, styles.profilePlaceholder]}><ActivityIndicator size="small" color={colors.primary} /></View>
                            ) : userProfile?.avatar_url ? (
                                <Image source={{ uri: userProfile.avatar_url }} style={styles.profilePic} contentFit="cover" />
                            ) : (
                                <View style={[styles.profilePic, styles.profilePlaceholder]}><Ionicons name="person-outline" size={24} color={colors.secondaryText} /></View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'to' && styles.activeTab]} onPress={() => { setActiveTab('to'); setAirportSuggestions([]); }}>
                        <Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>{t('home.toAirport')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'from' && styles.activeTab]} onPress={() => { setActiveTab('from'); setAirportSuggestions([]); }}>
                        <Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>{t('home.fromAirport')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.title}>{t('home.title')}</Text>

                <View style={styles.card}>
                    <View>
                        <InputRow 
                            icon={activeTab === 'to' ? 'home-outline' : 'airplane-outline'} 
                            placeholderKey={activeTab === 'to' ? 'home.fromPlaceholderAddress' : 'home.fromPlaceholder'} 
                            value={fromLocation} 
                            onChangeText={(text) => handleTextChange(text, 'from')} 
                            onFocus={() => handleFocus('from')}
                            onBlur={handleBlur}
                        />
                         {activeFieldForSuggestions === 'from' && (
                            <AirportSuggestionsList
                                suggestions={airportSuggestions}
                                onSelect={onAirportSelect}
                                style={{ top: 60, zIndex: 30 }}
                            />
                        )}
                    </View>
                    <View style={styles.divider} />
                    <View>
                        <InputRow 
                            icon={activeTab === 'to' ? 'airplane-outline' : 'location-outline'} 
                            placeholderKey={activeTab === 'to' ? 'home.dropoffPlaceholderAirport' : 'home.dropoffPlaceholder'} 
                            value={toLocation} 
                            onChangeText={(text) => handleTextChange(text, 'to')} 
                            onFocus={() => handleFocus('to')}
                            onBlur={handleBlur}
                        />
                         {activeFieldForSuggestions === 'to' && (
                            <AirportSuggestionsList
                                suggestions={airportSuggestions}
                                onSelect={onAirportSelect}
                                style={{ top: 60, zIndex: 30 }}
                            />
                        )}
                    </View>

                    {isSearching && <ActivityIndicator style={{ paddingVertical: 10 }} color={colors.primary} />}
                    
                    <View style={styles.divider} />
                    <View style={styles.detailsRow}>
                        <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('date')}>
                            <Text style={styles.detailLabel}>{t('home.dateLabel')}</Text>
                            <View style={styles.detailValueContainer}>
                                <Text style={styles.detailValue}>{moment(selectedDate).format('DD.MM')}</Text>
                                <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('time')}>
                            <Text style={styles.detailLabel}>{t('home.timeLabel')}</Text>
                            <View style={styles.detailValueContainer}>
                                <Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text>
                                <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} />
                            </View>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={styles.detailItem} onPress={() => setPassengerModalVisible(true)}>
                            <Text style={styles.detailLabel}>{t('home.passengersLabel')}</Text>
                            <View style={styles.detailValueContainer}>
                                <Text style={styles.detailValue}>{totalPassengers}</Text>
                                <Ionicons name="people-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} />
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <InputRow icon="briefcase-outline" placeholderKey="home.luggagePlaceholder" value={luggageInfo} onChangeText={setLuggageInfo} />
                    <View style={styles.divider} />
                    <View style={styles.flightInputContainer}>
                      <InputRow icon="barcode-outline" placeholderKey="home.flightNumberPlaceholder" value={flightNumber} onChangeText={setFlightNumber} style={{ flex: 1, paddingVertical: 0 }} />
                      <TouchableOpacity onPress={() => Alert.alert(t('home.flightInfoTitle'), t('home.flightInfoMessage'))} style={styles.infoIcon}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.secondaryText} />
                      </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.radioGroupContainer}>
                    <TouchableOpacity style={[styles.radioContainer, transferType === 'group' && styles.radioContainerActive]} onPress={() => setTransferType('group')}>
                        <GroupTransferIcon width={68} height={58} fill={transferType === 'group' ? colors.primary : colors.secondaryText} />
                        <Text style={[styles.radioText, transferType === 'group' && styles.radioTextActive]}>{t('home.groupTransfer')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.radioContainer, transferType === 'individual' && styles.radioContainerActive]} onPress={() => setTransferType('individual')}>
                        <IndividualTransferIcon width={68} height={58} fill={transferType === 'individual' ? colors.primary : colors.secondaryText} />
                        <Text style={[styles.radioText, transferType === 'individual' && styles.radioTextActive]}>{t('home.individualTransfer')}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}>
                    <Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                    <View style={styles.checkboxTextContainer}>
                        <Text style={styles.radioText}>{t('home.travelingWithPet')}</Text>
                        <Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text>
                    </View>
                    <Image source={Pet} style={styles.petImage} contentFit="contain" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setMeetWithSign(!meetWithSign)}>
                    <Ionicons name={meetWithSign ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                    <View style={styles.checkboxTextContainer}>
                        <Text style={styles.radioText}>{t('home.meetWithSign', 'Зустріти з табличкою')}</Text>
                        <Text style={styles.checkboxSubtext}>{t('home.signSubtext', 'Водій чекатиме з вашим іменем')}</Text>
                    </View>
                    <Ionicons name="person-add-outline" size={32} color={colors.secondaryText} style={styles.signIcon} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleOrderPress} disabled={isSubmitting}>
                    {isSubmitting ? (<ActivityIndicator color="#FFFFFF" />) : (<Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>)}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- СТИЛІ ---
const shadowStyle = { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 };

const getStyles = (colors, theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconButton: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', minWidth: 50, justifyContent: 'center', ...(theme === 'light' ? shadowStyle : {}) },
    profilePic: { width: 40, height: 40, borderRadius: 20 },
    profilePlaceholder: { backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border, width: 40, height: 40, borderRadius: 20 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 24, ...(theme === 'light' ? shadowStyle : {}) },
    tab: { flex: 1, paddingVertical: 16, borderRadius: 8 },
    activeTab: { backgroundColor: colors.primary },
    tabText: { color: colors.text, textAlign: 'center', fontWeight: '600', fontSize: 14 },
    activeTabText: { color: '#FFFFFF' },
    title: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 16,
        ...(theme === 'light' ? shadowStyle : {}),
        zIndex: 10,
    },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    textInput: { color: colors.text, fontSize: 16, marginLeft: 12, flex: 1 },
    divider: { height: 1, backgroundColor: colors.border || '#EFEFF4' },
    detailsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    detailItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    detailLabel: { color: colors.secondaryText, fontSize: 12, marginBottom: 4 },
    detailValueContainer: { flexDirection: 'row', alignItems: 'center' },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    verticalDivider: { height: '60%', width: 1, backgroundColor: colors.border || '#EFEFF4' },
    radioGroupContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    radioContainer: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1.5, backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 2, height: 110, ...(theme === 'light' ? shadowStyle : {}) },
    radioContainerActive: { backgroundColor: theme === 'light' ? '#EBF5FF' : 'rgba(10, 132, 255, 0.2)', borderColor: colors.primary },
    radioText: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
    radioTextActive: { color: colors.primary },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, justifyContent: 'space-between' },
    checkboxTextContainer: { flex: 1 },
    petImage: { width: 40, height: 40 },
    checkboxSubtext: { color: colors.secondaryText, fontSize: 14, textAlign: 'center' },
    submitButton: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', ...(theme === 'light' ? shadowStyle : {}) },
    submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400, alignItems: 'center', ...shadowStyle },
    modalCloseButton: { position: 'absolute', top: 16, right: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8, textAlign: 'center' },
    modalSubtitle: { fontSize: 15, color: colors.secondaryText, textAlign: 'center', marginBottom: 24 },
    modalCommentInput: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, width: '100%', height: 80, padding: 12, fontSize: 16, color: colors.text, textAlignVertical: 'top', marginBottom: 24 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalRowPrimaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, flex: 1, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
    modalFullWidthPrimaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    modalFullWidthSecondaryButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalSecondaryButton: { backgroundColor: colors.background, paddingVertical: 14, borderRadius: 12, flex: 1, marginRight: 8, alignItems: 'center', justifyContent: 'center', borderColor: colors.border, borderWidth: 1 },
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
    suggestionsContainer: {
        flex: 1,
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        zIndex: 50000,
        maxHeight: 250,
        ...shadowStyle,
    },
    suggestionItem: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    suggestionCity: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    suggestionName: {
        color: colors.secondaryText,
        fontSize: 13,
        marginTop: 2,
    },
});