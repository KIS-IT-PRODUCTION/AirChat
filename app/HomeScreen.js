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

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';

// Self-contained InputRow component
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
  // --- Hooks for contexts and state ---
  const { colors } = useTheme();
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

  // --- Handler Functions ---
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
      alert(t('profile.loggedInMessage', { defaultValue: 'You are logged in!' }));
    } else {
      navigation.navigate('Auth');
    }
  };
  
  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  const styles = getStyles(colors);

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
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setLanguageModalVisible(true)}>
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={styles.iconButtonText}>{i18n.language.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
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
          <InputRow icon="airplane-outline" placeholderKey="home.fromPlaceholder" />
          <View style={styles.divider} />
          <InputRow icon="location-outline" placeholderKey="home.dropoffPlaceholder" />
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
        
        {/* Transfer Type Card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.radioRow} onPress={() => setTransferType('individual')}>
            <FontAwesome5 name={transferType === 'individual' ? 'dot-circle' : 'circle'} solid size={20} color={colors.primary} />
            <Text style={styles.radioText}>{t('home.individualTransfer')}</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.radioRow} onPress={() => setTransferType('group')}>
            <FontAwesome5 name={transferType === 'group' ? 'dot-circle' : 'circle'} solid size={20} color={colors.primary} />
            <Text style={styles.radioText}>{t('home.groupTransfer')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Pet Checkbox */}
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setWithPet(!withPet)}>
          <FontAwesome5 name={withPet ? 'check-square' : 'square'} solid size={22} color={colors.primary} />
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
const getStyles = (colors) => StyleSheet.create({
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
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 50,
    justifyContent: 'center',
  },
  iconButtonText: { color: colors.text, marginLeft: 6, fontWeight: '600' },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { color: colors.text, textAlign: 'center', fontWeight: '600' },
  activeTabText: { color: '#FFFFFF' },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  radioText: { color: colors.text, fontSize: 16 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  checkboxSubtext: { color: colors.secondaryText, fontSize: 14 },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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