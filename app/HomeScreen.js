import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import Logo from '../assets/icon.svg';

// --- НОВЕ МОДАЛЬНЕ ВІКНО ДЛЯ АВТОРИЗАЦІЇ ---
const AuthPromptModal = ({ visible, onClose, onLogin, onRegister }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.successModalBackdrop}>
        <View style={styles.successModalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>{t('authPrompt.title', 'Потрібна авторизація')}</Text>
          <Text style={styles.modalSubtitle}>{t('authPrompt.subtitle', 'Щоб замовити трансфер, будь ласка, увійдіть або зареєструйтеся.')}</Text>
          
          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onRegister}>
              <Text style={styles.modalSecondaryButtonText}>{t('auth.register')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={onLogin}>
              <Text style={styles.modalPrimaryButtonText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


// --- КОМПОНЕНТ МОДАЛЬНОГО ВІКНА УСПІХУ (без змін) ---
const SuccessModal = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);
  const [comment, setComment] = useState('');

  const handleSendComment = () => {
    console.log('Sending comment:', comment);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.successModalBackdrop}>
        <View style={styles.successModalContent}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>{t('successModal.title')}</Text>
          <Text style={styles.modalSubtitle}>{t('successModal.subtitle')}</Text>
          
          <Text style={styles.modalSectionTitle}>{t('successModal.commentTitle')}</Text>
          <TextInput
            style={styles.modalCommentInput}
            placeholder={t('successModal.commentPlaceholder')}
            placeholderTextColor={colors.secondaryText}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
              <Text style={styles.modalSecondaryButtonText}>{t('successModal.closeButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleSendComment}>
              <Text style={styles.modalPrimaryButtonText}>{t('successModal.sendButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const InputRow = ({ icon, placeholderKey }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);

  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={20} color={colors.secondaryText} />
      <TextInput
        placeholder={t(placeholderKey)}
        placeholderTextColor={colors.secondaryText}
        style={styles.textInput}
      />
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { session } = useAuth(); // ✨ Отримуємо сесію для перевірки
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState('from');
  const [transferType, setTransferType] = useState('individual');
  const [withPet, setWithPet] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [isAuthModalVisible, setAuthModalVisible] = useState(false); // ✨ Стан для нового модального вікна

  const showPicker = (mode) => {
    setPickerMode(mode);
    setPickerVisibility(true);
  };
  const hidePicker = () => setPickerVisibility(false);

  const handleConfirm = (date) => {
    setSelectedDate(date);
    hidePicker();
  };

  const handleProfilePress = () => {
    // ✨ Використовуємо сесію для перевірки
    if (session?.user) {
      navigation.navigate('ProfileTab');
    } else {
      navigation.navigate('Auth');
    }
  };
  
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };
  
  // ✨ ОНОВЛЕНА ЛОГІКА КНОПКИ ЗАМОВЛЕННЯ
  const handleOrderPress = () => {
    if (session?.user) {
      // Якщо користувач залогінений, показуємо вікно успіху
      setSuccessModalVisible(true);
    } else {
      // Якщо ні - показуємо вікно з пропозицією увійти/зареєструватися
      setAuthModalVisible(true);
    }
  };

  // ✨ Функції для навігації з модального вікна
  const handleGoToLogin = () => {
    setAuthModalVisible(false);
    navigation.navigate('LoginScreen');
  };

  const handleGoToRegister = () => {
    setAuthModalVisible(false);
    navigation.navigate('RegistrationScreen');
  };

  const styles = getStyles(colors, theme);

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={isLanguageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('uk')}>
              <Text style={styles.langButtonText}>{t('languageModal.uk', 'Українська')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('en')}>
              <Text style={styles.langButtonText}>{t('languageModal.en', 'English')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('ro')}>
              <Text style={styles.langButtonText}>{t('languageModal.ro', 'Română')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <SuccessModal 
        visible={isSuccessModalVisible} 
        onClose={() => setSuccessModalVisible(false)} 
      />

      {/* ✨ ДОДАНО НОВЕ МОДАЛЬНЕ ВІКНО */}
      <AuthPromptModal
        visible={isAuthModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onLogin={handleGoToLogin}
        onRegister={handleGoToRegister}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <Logo width={40} height={40} />
          <View style={styles.headerCenter}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setLanguageModalVisible(true)}>
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={styles.iconButtonText}>{i18n.language.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ProfileTab', { screen: 'Support' })}>
              <Ionicons name="headset-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePress}>
              {session?.user ? (
                <Image source={require('../assets/profile.png')} style={styles.profilePic} />
              ) : (
                <View style={[styles.profilePic, styles.profilePlaceholder]}>
                  <Ionicons name="person-outline" size={24} color={colors.secondaryText} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'to' && styles.activeTab]}
            onPress={() => setActiveTab('to')}>
            <Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>{t('home.toAirport')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'from' && styles.activeTab]}
            onPress={() => setActiveTab('from')}>
            <Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>{t('home.fromAirport')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{t('home.title')}</Text>
        <View style={styles.card}>
          <InputRow
            icon={activeTab === 'to' ? 'home-outline' : 'airplane-outline'}
            placeholderKey={activeTab === 'to' ? 'home.fromPlaceholderAddress' : 'home.fromPlaceholder'}
          />
          <View style={styles.divider} />
          <InputRow
            icon={activeTab === 'to' ? 'airplane-outline' : 'location-outline'}
            placeholderKey={activeTab === 'to' ? 'home.dropoffPlaceholderAirport' : 'home.dropoffPlaceholder'}
          />
          <View style={styles.divider} />
          <InputRow icon="briefcase-outline" placeholderKey="home.luggagePlaceholder" />
          <View style={styles.divider} />
          <View style={styles.detailsRow}>
            <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('date')}>
              <Text style={styles.detailLabel}>{t('home.dateLabel')}</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{moment(selectedDate).format('D MMMM')}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }}/>
              </View>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('time')}>
              <Text style={styles.detailLabel}>{t('home.timeLabel')}</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text>
                <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }}/>
              </View>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>{t('home.passengersLabel')}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setPassengers(p => Math.max(1, p - 1))}>
                  <Ionicons name="remove-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.passengerCount}>{passengers}</Text>
                <TouchableOpacity onPress={() => setPassengers(p => p + 1)}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.radioGroupContainer}>
            <TouchableOpacity 
                style={[styles.radioContainer, transferType === 'individual' && styles.radioContainerActive]} 
                onPress={() => setTransferType('individual')}
            >
                <Text style={[styles.radioText, transferType === 'individual' && styles.radioTextActive]}>
                    {t('home.individualTransfer')}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.radioContainer, transferType === 'group' && styles.radioContainerActive]} 
                onPress={() => setTransferType('group')}
            >
                <Text style={[styles.radioText, transferType === 'group' && styles.radioTextActive]}>
                    {t('home.groupTransfer')}
                </Text>
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}>
          <Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
          <View>
            <Text style={styles.radioText}>{t('home.travelingWithPet')}</Text>
            <Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handleOrderPress}>
          <Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={pickerMode}
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        is24Hour={true}
        locale={i18n.language}
        confirmTextIOS={t('common.confirm')}
        cancelTextIOS={t('common.cancel')}
        date={selectedDate}
      />
    </SafeAreaView>
  );
}

// --- Dynamic Styles Function ---
const shadowStyle = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3.84,
  elevation: 5,
};

const getStyles = (colors, theme) => StyleSheet.create({
  container: { flex: 1,  backgroundColor: colors.background },
  scrollContent: { padding: 15, paddingBottom: 40,  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginBottom: 24,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerIcons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  iconButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
    justifyContent: 'center',
    ... (theme === 'light' ? shadowStyle : {}),
  },
  iconButtonText: { color: colors.text, marginLeft: 6, fontWeight: '600' },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    ... (theme === 'light' ? shadowStyle : {}),
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: colors.text, textAlign: 'center', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#FFFFFF' },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    ... (theme === 'light' ? shadowStyle : {}),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  textInput: {
    color: colors.text,
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  divider: { height: 1, backgroundColor: colors.border || '#3A3A3C' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  detailLabel: { color: colors.secondaryText, fontSize: 12, marginBottom: 4 },
  detailValueContainer: { flexDirection: 'row', alignItems: 'center' },
  detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  verticalDivider: { height: '60%', width: 1, backgroundColor: colors.border || '#3A3A3C' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passengerCount: { color: colors.text, fontSize: 16, fontWeight: 'bold' },
  radioGroupContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  radioContainer: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    borderColor: colors.border,
    alignItems: 'center',
    ... (theme === 'light' ? shadowStyle : {}),
  },
  radioContainerActive: {
    backgroundColor: theme === 'light' ? '#EBF5FF' : 'rgba(10, 132, 255, 0.2)',
    borderColor: colors.primary,
  },
  radioText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  radioTextActive: {
    color: colors.primary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  checkboxSubtext: { color: colors.secondaryText, fontSize: 14 },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ... (theme === 'light' ? shadowStyle : {}),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // --- СТИЛІ МОДАЛЬНИХ ВІКОН ---
  successModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  successModalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    ...shadowStyle,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  modalCommentInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    width: '100%',
    height: 100,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalSecondaryButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  
  // Стилі для модального вікна вибору мови
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.card,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  langButton: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#3A3A3C',
  },
  langButtonText: {
    color: colors.text,
    fontSize: 18,
    textAlign: 'center',
  },
});
