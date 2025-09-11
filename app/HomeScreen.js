import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, ActivityIndicator, Alert, Platform, KeyboardAvoidingView
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import 'moment/locale/uk';
import 'moment/locale/ro';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import GroupTransferIcon from '../assets/group.svg';
import IndividualTransferIcon from '../assets/induvidual.svg';
import Pet from '../assets/pets.png';

// --- (Інші допоміжні компоненти залишаються без змін) ---
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
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}><Pressable style={styles.modalContent}><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Ionicons name="close" size={28} color={colors.secondaryText} /></TouchableOpacity><Text style={styles.modalTitle}>{t('addCommentModal.title')}</Text><Text style={styles.modalSubtitle}>{t('addCommentModal.subtitle')}</Text><TextInput style={styles.modalCommentInput} placeholder={t('addCommentModal.commentPlaceholder')} placeholderTextColor={colors.secondaryText} value={comment} onChangeText={setComment} multiline /><View style={styles.modalButtonRow}><TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('addCommentModal.skipButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalRowPrimaryButton} onPress={handleSendComment}><Text style={styles.modalPrimaryButtonText}>{t('addCommentModal.sendButton')}</Text></TouchableOpacity></View></Pressable></KeyboardAvoidingView></Modal> );
};
const TransferSuccessModal = ({ visible, onClose, onViewTransfers }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.modalContent}><View style={styles.successIconContainer}><Ionicons name="checkmark-circle-outline" size={64} color={'#4CAF50'} /></View><Text style={styles.modalTitle}>{t('transferSuccess.title')}</Text><Text style={styles.modalSubtitle}>{t('transferSuccess.subtitle')}</Text><View style={styles.modalButtonColumn}><TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onViewTransfers}><Text style={styles.modalPrimaryButtonText}>{t('transferSuccess.viewTransfersButton')}</Text></TouchableOpacity><TouchableOpacity style={styles.modalFullWidthSecondaryButton} onPress={onClose}><Text style={styles.modalSecondaryButtonText}>{t('transferSuccess.closeButton')}</Text></TouchableOpacity></View></View></View></Modal> );
};
const InputRow = ({ icon, placeholderKey, value, onChangeText, style }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (<View style={[styles.inputRow, style]}><Ionicons name={icon} size={20} color={colors.secondaryText} /><TextInput placeholder={t(placeholderKey)} placeholderTextColor={colors.secondaryText} style={styles.textInput} value={value} onChangeText={onChangeText} /></View>);
};

// ✨ 1. НОВИЙ, ПЕРЕРОБЛЕНИЙ КОМПОНЕНТ МОДАЛЬНОГО ВІКНА
// Компонент для одного рядка пасажирів (напр. "Дорослі")
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

    const updateCount = (type, amount) => {
        setPassengerCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] + amount) }));
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{t('passengers.title')}</Text>
                    <PassengerRow
                        label={t('passengers.adults')}
                        sublabel={t('passengers.adultsAge')}
                        count={passengerCounts.adults}
                        onUpdate={(amount) => updateCount('adults', amount)}
                        minCount={1} // Завжди має бути хоча б один дорослий
                    />
                    <PassengerRow
                        label={t('passengers.children')}
                        sublabel={t('passengers.childrenAge')}
                        count={passengerCounts.children}
                        onUpdate={(amount) => updateCount('children', amount)}
                    />
                    <PassengerRow
                        label={t('passengers.infants')}
                        sublabel={t('passengers.infantsAge')}
                        count={passengerCounts.infants}
                        onUpdate={(amount) => updateCount('infants', amount)}
                    />
                    <TouchableOpacity style={styles.modalFullWidthPrimaryButton} onPress={onClose}>
                        <Text style={styles.modalPrimaryButtonText}>{t('common.done')}</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

// --- Основний компонент (без критичних змін) ---
export default function HomeScreen({ navigation }) {
    const { colors, theme } = useTheme();
    const { session } = useAuth();
    const { t, i18n } = useTranslation();
    
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
    const [isPickerVisible, setPickerVisibility] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [isAuthModalVisible, setAuthModalVisible] = useState(false);
    const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
    const [isPassengerModalVisible, setPassengerModalVisible] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isCommentModalVisible, setCommentModalVisible] = useState(false);
    const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
    const [lastTransferId, setLastTransferId] = useState(null);

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

    const handleOrderPress = async () => {
        if (!session?.user) { setAuthModalVisible(true); return; }
        if (!fromLocation || !toLocation) { Alert.alert(t('common.error'), t('home.error.fillFields')); return; }
        if (passengerCounts.adults === 0) { Alert.alert(t('common.error'), t('home.error.noAdults')); return; }
        setIsSubmitting(true);
        try {
            const transferData = { passenger_id: session.user.id, from_location: fromLocation, to_location: toLocation, transfer_datetime: selectedDate.toISOString(), adults_count: passengerCounts.adults, children_count: passengerCounts.children, infants_count: passengerCounts.infants, transfer_type: transferType, with_pet: withPet, meet_with_sign: meetWithSign, flight_number: flightNumber.trim() === '' ? null : flightNumber, luggage_info: luggageInfo, direction: activeTab === 'to' ? 'to_airport' : 'from_airport' };
            const { data, error } = await supabase.from('transfers').insert([transferData]).select('id').single();
            if (error) throw error;
            setLastTransferId(data.id);
            setCommentModalVisible(true);
            setFromLocation(''); setToLocation(''); setFlightNumber(''); setLuggageInfo(''); setWithPet(false); setMeetWithSign(false); setPassengerCounts({ adults: 1, children: 0, infants: 0 });
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleCommentSubmit = async (comment) => {
        if (!lastTransferId || !comment) { proceedToSuccessModal(); return; }
        try {
            const { error } = await supabase.from('transfers').update({ passenger_comment: comment }).eq('id', lastTransferId);
            if (error) throw error;
        } catch (error) {
            Alert.alert(t('common.error'), error.message);
        } finally {
            proceedToSuccessModal();
        }
    };
    
    const proceedToSuccessModal = () => { setCommentModalVisible(false); setSuccessModalVisible(true); };
    const handleViewTransfers = () => { setSuccessModalVisible(false); navigation.navigate('TransfersTab'); };
    const handleProfilePress = () => { if (session?.user) { navigation.navigate('ProfileTab'); } else { navigation.navigate('Auth'); } };
    const showPicker = (mode) => { setPickerMode(mode); setPickerVisibility(true); };
    const hidePicker = () => setPickerVisibility(false);
    const handleConfirm = (date) => { setSelectedDate(date); hidePicker(); };
    const handleLanguageChange = (lang) => { i18n.changeLanguage(lang); setLanguageModalVisible(false); };
    const handleGoToLogin = () => { setAuthModalVisible(false); navigation.navigate('LoginScreen'); };
    const handleGoToRegister = () => { setAuthModalVisible(false); navigation.navigate('RegistrationScreen'); };
    const showFlightNumberInfo = () => { Alert.alert(t('home.flightInfoTitle'), t('home.flightInfoMessage')); };

    const styles = getStyles(colors, theme);

    return (
        <SafeAreaView style={styles.container}>
            <AuthPromptModal visible={isAuthModalVisible} onClose={() => setAuthModalVisible(false)} onLogin={handleGoToLogin} onRegister={handleGoToRegister} />
            <AddCommentModal visible={isCommentModalVisible} onClose={() => handleCommentSubmit('')} onCommentSubmit={handleCommentSubmit} />
            <TransferSuccessModal visible={isSuccessModalVisible} onClose={() => setSuccessModalVisible(false)} onViewTransfers={handleViewTransfers} />
            <Modal animationType="slide" transparent={true} visible={isLanguageModalVisible} onRequestClose={() => setLanguageModalVisible(false)}><Pressable style={styles.bottomModalBackdrop} onPress={() => setLanguageModalVisible(false)}><View style={styles.bottomModalContent}><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('uk')}><Text style={styles.langButtonText}>{t('languageModal.uk')}</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('en')}><Text style={styles.langButtonText}>{t('languageModal.en')}</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('ro')}><Text style={styles.langButtonText}>{t('languageModal.ro')}</Text></TouchableOpacity></View></Pressable></Modal>
            <PassengerSelectorModal visible={isPassengerModalVisible} onClose={() => setPassengerModalVisible(false)} passengerCounts={passengerCounts} setPassengerCounts={setPassengerCounts} />
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
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
                                <Image
                                    source={{ uri: userProfile.avatar_url }}
                                    style={styles.profilePic}
                                    contentFit="cover"
                                    transition={300}
                                    cachePolicy="disk"
                                />
                            ) : (
                                <View style={[styles.profilePic, styles.profilePlaceholder]}><Ionicons name="person-outline" size={24} color={colors.secondaryText} /></View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.tabContainer}>
                    <TouchableOpacity style={[styles.tab, activeTab === 'to' && styles.activeTab]} onPress={() => setActiveTab('to')}>
                        <Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>{t('home.toAirport')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, activeTab === 'from' && styles.activeTab]} onPress={() => setActiveTab('from')}>
                        <Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>{t('home.fromAirport')}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.title}>{t('home.title')}</Text>
                <View style={styles.card}>
                    <InputRow icon={activeTab === 'to' ? 'home-outline' : 'airplane-outline'} placeholderKey={activeTab === 'to' ? 'home.fromPlaceholderAddress' : 'home.fromPlaceholder'} value={fromLocation} onChangeText={setFromLocation} />
                    <View style={styles.divider} />
                    <InputRow icon={activeTab === 'to' ? 'airplane-outline' : 'location-outline'} placeholderKey={activeTab === 'to' ? 'home.dropoffPlaceholderAirport' : 'home.dropoffPlaceholder'} value={toLocation} onChangeText={setToLocation} />
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
                        <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('time')}><Text style={styles.detailLabel}>{t('home.timeLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text><Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity style={styles.detailItem} onPress={() => setPassengerModalVisible(true)}><Text style={styles.detailLabel}>{t('home.passengersLabel')}</Text><View style={styles.detailValueContainer}><Text style={styles.detailValue}>{totalPassengers}</Text><Ionicons name="people-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }} /></View></TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <InputRow icon="briefcase-outline" placeholderKey="home.luggagePlaceholder" value={luggageInfo} onChangeText={setLuggageInfo} />
                    <View style={styles.divider} />
                    <View style={styles.flightInputContainer}>
                        <InputRow icon="barcode-outline" placeholderKey="home.flightNumberPlaceholder" value={flightNumber} onChangeText={setFlightNumber} style={{ flex: 1, paddingVertical: 0 }} />
                        <TouchableOpacity onPress={showFlightNumberInfo} style={styles.infoIcon}><Ionicons name="information-circle-outline" size={24} color={colors.secondaryText} /></TouchableOpacity>
                    </View>
                </View>
                <View style={styles.radioGroupContainer}>
                    <TouchableOpacity style={[styles.radioContainer, transferType === 'group' && styles.radioContainerActive]} onPress={() => setTransferType('group')}><GroupTransferIcon width={68} height={58} fill={transferType === 'group' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText,  transferType === 'group' && styles.radioTextActive]}>{t('home.groupTransfer')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.radioContainer, transferType === 'individual' && styles.radioContainerActive]} onPress={() => setTransferType('individual')}><IndividualTransferIcon width={68} height={58} fill={transferType === 'individual' ? colors.primary : colors.secondaryText} /><Text style={[styles.radioText, transferType === 'individual' && styles.radioTextActive]}>{t('home.individualTransfer')}</Text></TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}>
                    <Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                    <View style={styles.checkboxTextContainer}><Text style={styles.radioText}>{t('home.travelingWithPet')}</Text><Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text></View>
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

                <TouchableOpacity style={styles.submitButton} onPress={handleOrderPress} disabled={isSubmitting}>{isSubmitting ? (<ActivityIndicator color="#FFFFFF" />) : (<Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>)}</TouchableOpacity>
            </ScrollView>
            <DateTimePickerModal isVisible={isPickerVisible} mode={pickerMode} onConfirm={handleConfirm} onCancel={hidePicker} is24Hour={true} locale={i18n.language} confirmTextIOS={t('common.confirm')} cancelTextIOS={t('common.cancel')} date={selectedDate} />
        </SafeAreaView>
    );
}

// ✨ 2. ОНОВЛЕНІ СТИЛІ: Додано стилі для нового модального вікна
const shadowStyle = { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 };
const getStyles = (colors, theme) => StyleSheet.create({
    container:{flex:1,backgroundColor:colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0},
    scrollContent:{padding:15,paddingBottom:40},
    header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
    headerIcons:{flexDirection:'row',alignItems:'center',gap:12},
    iconButton:{backgroundColor:colors.card,borderRadius:20,paddingHorizontal:12,paddingVertical:8,flexDirection:'row',alignItems:'center',minWidth:50,justifyContent:'center',...(theme==='light'?shadowStyle:{})},
    profilePic:{width:40,height:40,borderRadius:20},
    profilePlaceholder:{backgroundColor:colors.card,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:colors.border},
    tabContainer:{flexDirection:'row',backgroundColor:colors.card,borderRadius:12,padding:4,marginBottom:24,...(theme==='light'?shadowStyle:{})},
    tab:{flex:1,paddingVertical:16,borderRadius:8},
    activeTab:{backgroundColor:colors.primary},
    tabText:{color:colors.text,textAlign:'center',fontWeight:'600',fontSize:14},
    activeTabText:{color:'#FFFFFF'},
    title:{color:colors.text,fontSize:24,fontWeight:'bold',marginBottom:16},
    card:{backgroundColor:colors.card,borderRadius:16,paddingHorizontal:16,marginBottom:16,...(theme==='light'?shadowStyle:{})},
    inputRow:{flexDirection:'row',alignItems:'center',paddingVertical:14},
    textInput:{color:colors.text,fontSize:16,marginLeft:12,flex:1},
    divider:{height:1,backgroundColor:colors.border||'#3A3A3C'},
    detailsRow:{flexDirection:'row',alignItems:'center',paddingVertical:10},
    detailItem:{flex:1,alignItems:'center',paddingVertical:6},
    detailLabel:{color:colors.secondaryText,fontSize:12,marginBottom:4},
    detailValueContainer:{flexDirection:'row',alignItems:'center'},
    detailValue:{color:colors.text,fontSize:16,fontWeight:'600'},
    verticalDivider:{height:'60%',width:1,backgroundColor:colors.border||'#3A3A3C'},
    radioGroupContainer:{flexDirection:'row',gap:12,marginBottom:16},
    radioContainer:{flex:1,padding:16,borderRadius:16,borderWidth:1.5,backgroundColor:colors.card,borderColor:colors.border,alignItems:'center', justifyContent: 'center', gap: 2, height: 110, ...(theme==='light'?shadowStyle:{})},
    radioContainerActive:{backgroundColor:theme==='light'?'#EBF5FF':'rgba(10, 132, 255, 0.2)',borderColor:colors.primary},
    radioText:{color:colors.text,fontSize:16,fontWeight:'600', textAlign: 'center'},
    radioTextActive:{color:colors.primary},
    checkboxRow:{flexDirection:'row',alignItems:'center',padding:16,gap:12, justifyContent: 'space-between'},
    checkboxTextContainer: {flex: 1},
    petImage: {width: 40, height: 40},
    checkboxSubtext:{color:colors.secondaryText,fontSize:14, textAlign: 'center'},
    submitButton:{backgroundColor:colors.primary,paddingVertical:16,borderRadius:16,alignItems:'center',...(theme==='light'?shadowStyle:{})},
    submitButtonText:{color:'#FFFFFF',fontSize:18,fontWeight:'bold'},
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    bottomModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: colors.card, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400, alignItems: 'center', ...shadowStyle },
    bottomModalContent: { backgroundColor: colors.card, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    modalCloseButton:{position:'absolute',top:16,right:16},
    modalTitle:{fontSize:22,fontWeight:'bold',color:colors.text,marginBottom:8, textAlign: 'center'},
    modalSubtitle:{fontSize:15,color:colors.secondaryText,textAlign:'center',marginBottom:24},
    modalCommentInput:{backgroundColor:colors.background,borderColor:colors.border,borderWidth:1,borderRadius:12,width:'100%',height:80,padding:12,fontSize:16,color:colors.text,textAlignVertical:'top',marginBottom:24},
    modalButtonRow:{flexDirection:'row',justifyContent:'space-between',width:'100%'},
    modalRowPrimaryButton:{backgroundColor:colors.primary,paddingVertical:14,borderRadius:12,flex:1,marginLeft:8,alignItems:'center',justifyContent:'center'},
    modalFullWidthPrimaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    modalFullWidthSecondaryButton: { backgroundColor: 'transparent', paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    modalSecondaryButton:{backgroundColor:colors.background,paddingVertical:14,borderRadius:12,flex:1,marginRight:8,alignItems:'center',justifyContent:'center',borderColor:colors.border,borderWidth:1},
    modalSecondaryButtonText:{color:colors.text,fontSize:16,fontWeight:'600'},
    modalPrimaryButtonText:{color:'#FFFFFF',fontSize:16,fontWeight:'bold'},
    langButton:{paddingVertical:16,borderBottomWidth:1,borderBottomColor:colors.border||'#3A3A3C'},
    langButtonText:{color:colors.text,fontSize:18,textAlign:'center'},
    successIconContainer: { marginBottom: 16 },
    modalButtonColumn: { width: '100%', marginTop: 8 },
    flightInputContainer: {flexDirection: 'row', alignItems: 'center'},
    infoIcon: {paddingLeft: 12, paddingVertical: 14},
    signIcon: { width: 40, height: 40, textAlign: 'center' },
    // Нові стилі для PassengerSelectorModal
    passengerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    passengerLabel: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    passengerSublabel: {
        color: colors.secondaryText,
        fontSize: 13,
    },
    passengerCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    passengerCountText: {
        color: colors.text,
        fontSize: 22,
        fontWeight: 'bold',
        minWidth: 30,
        textAlign: 'center',
    }
});
