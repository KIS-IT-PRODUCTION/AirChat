import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Pressable,
  LayoutAnimation, // Import for animation
  UIManager,      // Import for animation on Android
  Platform,       // Import for platform-specific code
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Logo from '../assets/icon.svg'; // Імпортуємо векторний логотип

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Reusable component for an editable field
const EditableField = ({ labelKey, icon, value, isEditing, onToggleEdit, onChangeText }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);
  
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{t(labelKey)}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
        {isEditing ? (
          <TextInput
            style={styles.inputText}
            value={value}
            onChangeText={onChangeText}
            autoFocus={true}
          />
        ) : (
          <Text style={styles.inputText}>{value}</Text>
        )}
        <TouchableOpacity onPress={onToggleEdit}>
          <Ionicons name={isEditing ? "checkmark-circle-outline" : "create-outline"} size={24} color={isEditing ? colors.primary : colors.secondaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// New, beautiful theme switcher component
const ThemeSwitcher = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const styles = getStyles(colors);
const { t } = useTranslation();
  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTheme();
  };

  return (
    <View style={styles.themeRow}>
      <Text style={styles.label}>{t('settings.darkTheme')}</Text>
      <TouchableOpacity onPress={handlePress} style={styles.switchContainer}>
        <View style={[styles.switchIconContainer, theme === 'light' && styles.switchIconActive]}>
          <Ionicons name="sunny-outline" size={18} color={theme === 'light' ? colors.primary : colors.secondaryText} />
        </View>
        <View style={[styles.switchIconContainer, theme === 'dark' && styles.switchIconActive]}>
          <Ionicons name="moon-outline" size={18} color={theme === 'dark' ? colors.primary : colors.secondaryText} />
        </View>
      </TouchableOpacity>
    </View>
  );
};


export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const styles = getStyles(colors);

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(session?.user?.user_metadata?.phone || '');
  const [loading, setLoading] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("You've refused to allow this app to access your photos!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };
  
  const handleSaveChanges = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(t('common.success'), t('settings.profileSaved'));
      navigation.goBack();
    }, 1000);
  };
  
  const toggleEdit = (fieldName) => {
    setEditingField(prevField => prevField === fieldName ? null : fieldName);
  };

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

      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
            <Logo width={40} height={40} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <Image 
            source={avatarUrl ? { uri: avatarUrl } : require('../assets/profile.png')} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
            <Text style={styles.changeButtonText}>{t('settings.changePhoto')}</Text>
            <Ionicons name="image-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <EditableField
            labelKey="registration.fullNameLabel"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            isEditing={editingField === 'fullName'}
            onToggleEdit={() => toggleEdit('fullName')}
          />
          <EditableField
            labelKey="registration.phoneLabel"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            isEditing={editingField === 'phone'}
            onToggleEdit={() => toggleEdit('phone')}
          />
          {/* Restored non-editable fields */}
          <EditableField
            labelKey="settings.language"
            icon="language-outline"
            value={t(`settings.${i18n.language}`)}
            onToggleEdit={() => setLanguageModalVisible(true)}
          />
          <EditableField
            labelKey="registration.emailLabel"
            icon="mail-outline"
            value={session?.user?.email}
            onToggleEdit={() => Alert.alert(t('settings.emailCannotBeChanged'))}
          />
          <EditableField
            labelKey="registration.passwordLabel"
            icon="lock-closed-outline"
            value={"••••••••••••••"}
            onToggleEdit={() => {}} // Non-functional edit button
          />
          <TouchableOpacity>
            <Text style={styles.changePasswordLink}>{t('settings.changePassword')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* New Theme Switcher */}
        <ThemeSwitcher />
        
        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={loading}>
          <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{loading ? t('common.loading') : t('settings.saveProfile')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    logo: { width: 40, height: 40, resizeMode: 'contain' },
    scrollContainer: { paddingHorizontal: 24, paddingBottom: 40 },
    avatarContainer: { alignItems: 'center', marginVertical: 24 },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.card },
    changeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16, gap: 8 },
    changeButtonText: { color: '#FFFFFF', fontWeight: '600' },
    form: { marginBottom: 24 },
    fieldContainer: { marginBottom: 16 },
    label: { color: colors.secondaryText, fontSize: 14, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 50 },
    inputIcon: { marginRight: 12 },
    inputText: { flex: 1, color: colors.text, fontSize: 16 },
    passwordText: { flex: 1, color: colors.text, fontSize: 24, letterSpacing: 2 },
    changePasswordLink: { color: colors.primary, textAlign: 'right', marginTop: 8, fontWeight: '600' },
    saveButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
    saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: colors.card, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    langButton: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    langButtonText: { color: colors.text, fontSize: 18, textAlign: 'center' },
    // New styles for ThemeSwitcher
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    switchContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 4 },
    switchIconContainer: { padding: 6, borderRadius: 16 },
    switchIconActive: { backgroundColor: colors.card },
});