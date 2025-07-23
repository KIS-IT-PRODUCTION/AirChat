import 'react-native-gesture-handler'; // Має бути першим імпортом у вашому додатку
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
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../app/ThemeContext'; // Переконайтесь, що шлях правильний

// Імпорт бібліотек для вибору дати/часу
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import 'moment/locale/uk'; // Включаємо українську локалізацію

// Встановлюємо локаль за замовчуванням
moment.locale('uk');

// Компонент для рядка вводу, що підтримує теми
const InputRow = ({ icon, placeholder, colors }) => {
  const styles = getStyles(colors);
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={20} color={colors.secondaryText} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        style={styles.textInput}
      />
    </View>
  );
};

export default function HomeScreen() {
  // --- Отримуємо тему ---
  const { colors } = useTheme();
  // --- Генеруємо стилі на основі теми ---
  const styles = getStyles(colors);

  // --- Стани для UI ---
  const [activeTab, setActiveTab] = useState('from');
  const [transferType, setTransferType] = useState('individual');
  const [withPet, setWithPet] = useState(false);
  const [passengers, setPassengers] = useState(1);
  
  // --- Стани для Date/Time Picker ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  
  // --- Функції для керування Date/Time Picker ---
  const showPicker = (mode) => {
    setPickerMode(mode);
    setPickerVisibility(true);
  };

  const hidePicker = () => {
    setPickerVisibility(false);
  };

  const handleConfirm = (date) => {
    setSelectedDate(date);
    hidePicker();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- Хедер --- */}
        <View style={styles.header}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logo}
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="globe-outline" size={20} color={colors.text} />
              <Text style={styles.iconButtonText}>UK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="headset-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image
                source={require('../assets/profile.png')}
                style={styles.profilePic}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Таби --- */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'to' && styles.activeTab]}
            onPress={() => setActiveTab('to')}>
            <Text style={[styles.tabText, activeTab === 'to' && styles.activeTabText]}>
              До аеропорту
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'from' && styles.activeTab]}
            onPress={() => setActiveTab('from')}>
            <Text style={[styles.tabText, activeTab === 'from' && styles.activeTabText]}>
              З аеропорту
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Замов трансфер до/з аеропорту</Text>

        {/* --- Головна форма --- */}
        <View style={styles.card}>
          <InputRow icon="airplane-outline" placeholder="Звідки?" colors={colors} />
          <View style={styles.divider} />
          <InputRow icon="location-outline" placeholder="Місце висадки (готель, адреса...)" colors={colors} />
          <View style={styles.divider} />
          <InputRow icon="briefcase-outline" placeholder="Кількість одиниць багажу" colors={colors} />
          <View style={styles.divider} />
          <View style={styles.detailsRow}>
            {/* Кнопка вибору дати */}
            <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('date')}>
              <Text style={styles.detailLabel}>Дата</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{moment(selectedDate).format('D MMMM')}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }}/>
              </View>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            {/* Кнопка вибору часу */}
            <TouchableOpacity style={styles.detailItem} onPress={() => showPicker('time')}>
              <Text style={styles.detailLabel}>Час</Text>
              <View style={styles.detailValueContainer}>
                <Text style={styles.detailValue}>{moment(selectedDate).format('HH:mm')}</Text>
                <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginLeft: 5 }}/>
              </View>
            </TouchableOpacity>
            <View style={styles.verticalDivider} />
            {/* Лічильник пасажирів */}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>К-сть пасажирів</Text>
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
        
        {/* --- Вибір типу трансферу --- */}
        <View style={styles.card}>
            <TouchableOpacity style={styles.radioRow} onPress={() => setTransferType('individual')}>
                <FontAwesome5 name={transferType === 'individual' ? 'dot-circle' : 'circle'} solid size={20} color={colors.primary} />
                <Text style={styles.radioText}>Індивідуальний трансфер</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.radioRow} onPress={() => setTransferType('group')}>
                <FontAwesome5 name={transferType === 'group' ? 'dot-circle' : 'circle'} solid size={20} color={colors.primary} />
                <Text style={styles.radioText}>Груповий трансфер</Text>
            </TouchableOpacity>
        </View>
        
        {/* --- Чекбокс тварини --- */}
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setWithPet(!withPet)}>
            <FontAwesome5 name={withPet ? 'check-square' : 'square'} solid size={22} color={colors.primary} />
            <View>
                <Text style={styles.radioText}>Подорожує тварина</Text>
                <Text style={styles.checkboxSubtext}>(наприклад, кішка або собака)</Text>
            </View>
        </TouchableOpacity>

        {/* --- Кнопка "Замовити" --- */}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Замовити трансфер</Text>
        </TouchableOpacity>

        {/* --- Футер --- */}
        <View style={styles.footer}>
            <Text style={styles.footerText}>Не знаєте як працює додаток?</Text>
            <TouchableOpacity>
                <Text style={styles.footerLink}>Інструкція та знайомство з функціями</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- Модальне вікно для вибору дати/часу --- */}
      <DateTimePickerModal
        isVisible={isPickerVisible}
        mode={pickerMode}
        onConfirm={handleConfirm}
        onCancel={hidePicker}
        is24Hour={true}
        locale="uk_UA"
        confirmTextIOS="Підтвердити"
        cancelTextIOS="Скасувати"
        date={selectedDate} // Передаємо поточну дату для ініціалізації пікера
      />
    </SafeAreaView>
  );
}

// --- Динамічна функція для генерації стилів ---
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
    divider: { height: 1, backgroundColor: colors.border },
    detailsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    detailItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    detailLabel: { color: colors.secondaryText, fontSize: 12, marginBottom: 4 },
    detailValueContainer: { flexDirection: 'row', alignItems: 'center' },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    verticalDivider: { height: '60%', width: 1, backgroundColor: colors.border },
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
    color: '#fff', // Зазвичай текст на основній кнопці білий
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
      alignItems: 'center',
      marginTop: 24,
  },
  footerText: {
      color: colors.secondaryText,
      fontSize: 14,
  },
  footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 4,
  },
});