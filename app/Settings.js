import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Pressable, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';

// Reusable component for an editable field
const EditableField = ({ labelKey, icon, value, onEditPress, isPassword = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = getStyles(colors);
  
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{t(labelKey)}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
        <Text style={isPassword ? styles.passwordText : styles.inputText}>{value}</Text>
        <TouchableOpacity onPress={onEditPress}>
          <Ionicons name={isPassword ? "eye-off-outline" : "create-outline"} size={22} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function SettingsScreen({ navigation }) {
  const { colors, theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const styles = getStyles(colors);

  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(session?.user?.user_metadata?.phone || '');
  const [loading, setLoading] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  const handleEdit = (titleKey, currentValue, callback) => {
    Alert.prompt(
      t(titleKey),
      null,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: (text) => callback(text) },
      ],
      'plain-text',
      currentValue
    );
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        phone: phone,
      }
    });

    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('settings.profileSaved'));
    }
    setLoading(false);
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
        <Image source={require('../assets/icon.png')} style={styles.logo} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: 'https://i.imgur.com/your-profile-pic.png' }} style={styles.avatar} />
          <TouchableOpacity style={styles.changeButton}>
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
            onEditPress={() => handleEdit('settings.editFullName', fullName, setFullName)}
          />
          <EditableField
            labelKey="registration.phoneLabel"
            icon="call-outline"
            value={phone}
            onEditPress={() => handleEdit('settings.editPhone', phone, setPhone)}
          />
          <EditableField
            labelKey="settings.language"
            icon="language-outline"
            value={t(`settings.${i18n.language}`)}
            onEditPress={() => setLanguageModalVisible(true)}
          />
          <EditableField
            labelKey="registration.emailLabel"
            icon="mail-outline"
            value={session?.user?.email}
            onEditPress={() => Alert.alert(t('settings.emailCannotBeChanged'))}
          />
          <EditableField
            labelKey="registration.passwordLabel"
            icon="lock-closed-outline"
            value={"••••••••••••••"}
            isPassword={true}
            onEditPress={() => {}}
          />
          <TouchableOpacity>
            <Text style={styles.changePasswordLink}>{t('settings.changePassword')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Theme Toggle Switch */}
        <View style={styles.themeRow}>
          <Text style={styles.label}>{t('settings.darkTheme')}</Text>
          <Switch
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={'#f4f3f4'}
            onValueChange={toggleTheme}
            value={theme === 'dark'}
          />
        </View>
        
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
    avatar: { width: 120, height: 120, borderRadius: 60 },
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
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 32 },
    saveButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: colors.card, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    langButton: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    langButtonText: { color: colors.text, fontSize: 18, textAlign: 'center' },
});