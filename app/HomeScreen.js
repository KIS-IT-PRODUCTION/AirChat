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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';

// Self-contained InputRow component
const InputRow = ({ icon, placeholderKey }) => {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors, theme);

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

export default function HomeScreen() {
  const { colors, theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState('from');
  const [transferType, setTransferType] = useState('individual');
  const [withPet, setWithPet] = useState(false);
  const [passengers, setPassengers] = useState(1);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const navigation = useNavigation();
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
    if (isAuthenticated) {
      navigation.navigate('ProfileTab');
    } else {
      navigation.navigate('Auth');
    }
  };
  
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  const styles = getStyles(colors, theme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isLanguageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('uk')}>
              <Text style={styles.langButtonText}>Українська</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('en')}>
              <Text style={styles.langButtonText}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('ro')}>
              <Text style={styles.langButtonText}>Română</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />  <TouchableOpacity style={styles.iconButton} onPress={() => setLanguageModalVisible(true)}>
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={styles.iconButtonText}>{i18n.language.toUpperCase()}</Text>
            </TouchableOpacity>
          <View style={styles.headerIcons}>
                     <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ProfileTab', { screen: 'Support' })}>
  <Ionicons name="headset-outline" size={24} color={colors.text} />
</TouchableOpacity>
            <TouchableOpacity onPress={handleProfilePress}>
              <Image source={require('../assets/profile.png')} style={styles.profilePic} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
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

        {/* Main Form Card */}
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
        
        {/* --- ОНОВЛЕНИЙ БЛОК ВИБОРУ ТИПУ ТРАНСФЕРУ --- */}
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
        
        {/* Pet Checkbox */}
        <TouchableOpacity style={[styles.card, styles.checkboxRow]} onPress={() => setWithPet(!withPet)}>
          <Ionicons name={withPet ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
          <View>
            <Text style={styles.radioText}>{t('home.travelingWithPet')}</Text>
            <Text style={styles.checkboxSubtext}>{t('home.petSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Order Button */}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>{t('home.orderButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Picker Modal */}
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={pickerMode}
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        is24Hour={true}
        locale="uk_UA"
        confirmTextIOS={t('common.confirm', { defaultValue: 'Confirm' })}
        cancelTextIOS={t('common.cancel', { defaultValue: 'Cancel' })}
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: { width: 50, height: 50, resizeMode: 'contain' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  
  // --- НОВІ СТИЛІ ДЛЯ ВИБОРУ ТИПУ ТРАНСФЕРУ ---
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