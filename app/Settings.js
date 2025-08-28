import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Pressable, Platform, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';

// --- Компоненти полів ---
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
                    <TextInput style={styles.inputText} value={value} onChangeText={onChangeText} autoFocus={true} />
                ) : (
                    <Text style={styles.inputText} numberOfLines={1}>{value || t('settings.notSet')}</Text>
                )}
                <TouchableOpacity onPress={onToggleEdit}>
                    <Ionicons name={isEditing ? "checkmark-circle" : "create-outline"} size={24} color={isEditing ? colors.primary : colors.secondaryText} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ReadOnlyField = ({ labelKey, icon, value }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t(labelKey)}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
                <Text style={[styles.inputText, { opacity: 0.7 }]}>{value}</Text>
            </View>
        </View>
    );
};

const PasswordField = ({ labelKey, icon, onNavigate }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t(labelKey)}</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={onNavigate}>
                <Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />
                <Text style={styles.inputText}>••••••••</Text>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
    );
};

const ThemeSwitcher = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const { t } = useTranslation();
  return (
    <View style={styles.themeRow}><Text style={styles.label}>{t('settings.darkTheme')}</Text><TouchableOpacity onPress={toggleTheme} style={styles.switchContainer}><View style={[styles.switchIconContainer, theme === 'light' && styles.switchIconActive]}><Ionicons name="sunny-outline" size={18} color={theme === 'light' ? colors.primary : colors.secondaryText} /></View><View style={[styles.switchIconContainer, theme === 'dark' && styles.switchIconActive]}><Ionicons name="moon-outline" size={18} color={theme === 'dark' ? colors.primary : colors.secondaryText} /></View></TouchableOpacity></View>
  );
};

// --- Модальні вікна ---
const AvatarSelectionModal = ({ visible, onClose, onPickFromGallery, onSelectPreset }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    const presetAvatars = [
        { id: 'male', icon: 'man-outline', color: '#0A84FF' },
        { id: 'female', icon: 'woman-outline', color: '#FF69B4' },
        { id: 'anon', icon: 'person-outline', color: colors.secondaryText },
    ];
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <View style={styles.avatarModalContent}>
                    <Text style={styles.modalTitle}>{t('settings.avatarModalTitle')}</Text>
                    <View style={styles.presetAvatarsContainer}>
                        {presetAvatars.map(avatar => (
                            <TouchableOpacity key={avatar.id} style={[styles.presetAvatarCircle, { backgroundColor: `${avatar.color}20` }]} onPress={() => onSelectPreset(avatar.id)}>
                                <Ionicons name={avatar.icon} size={40} color={avatar.color} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.galleryButton} onPress={onPickFromGallery}>
                        <Ionicons name="images-outline" size={24} color={colors.primary} />
                        <Text style={styles.galleryButtonText}>{t('settings.pickFromGallery')}</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

const ChangePasswordModal = ({ visible, onClose, onSave, isSaving }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSave = () => {
        if (newPassword.length < 6) { Alert.alert(t('common.error'), t('settings.passwordTooShort')); return; }
        if (newPassword !== confirmPassword) { Alert.alert(t('common.error'), t('settings.passwordsDoNotMatch')); return; }
        onSave(newPassword);
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <View style={styles.avatarModalContent}>
                    <Text style={styles.modalTitle}>{t('settings.changePassword')}</Text>
                    <TextInput style={styles.modalInput} placeholder={t('settings.newPassword')} placeholderTextColor={colors.secondaryText} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                    <TextInput style={styles.modalInput} placeholder={t('settings.confirmNewPassword')} placeholderTextColor={colors.secondaryText} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
                    <TouchableOpacity style={styles.galleryButton} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.galleryButtonText}>{t('settings.savePassword')}</Text>}
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
};

// --- Основний компонент ---
export default function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuth();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [localAvatar, setLocalAvatar] = useState(null); 
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    try { setLoading(true); const { data, error } = await supabase.from('profiles').select('full_name, phone, avatar_url').eq('id', session.user.id).single(); if (error) throw error; if (data) { setFullName(data.full_name || ''); setPhone(data.phone || ''); setAvatarUrl(data.avatar_url || null); } } catch (error) { Alert.alert(t('common.error'), error.message); } finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const pickImage = async () => {
    setAvatarModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('settings.galleryPermissionError'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setTimeout(() => setLocalAvatar(result.assets[0]), 100);
    }
  };

  const handleSelectPresetAvatar = (type) => {
    const presetBaseUrl = `https://api.dicebear.com/8.x/initials/png?seed=`;
    let newUrl;
    switch(type) {
        case 'male': newUrl = `${presetBaseUrl}${fullName || 'John Doe'}&backgroundColor=b6e3f4`; break;
        case 'female': newUrl = `${presetBaseUrl}${fullName || 'Jane Doe'}&backgroundColor=ffdfbf`; break;
        default: newUrl = `${presetBaseUrl}${fullName || 'Anon'}&backgroundColor=c0c0c0`; break;
    }
    setAvatarUrl(newUrl);
    setLocalAvatar(null);
    setAvatarModalVisible(false);
  };

  const handleSaveChanges = async () => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      let newAvatarUrl = avatarUrl;
      if (localAvatar) {
        const fileExt = localAvatar.uri.split('.').pop().toLowerCase();
        const filePath = `${session.user.id}.${fileExt}`;
        const contentType = localAvatar.mimeType || `image/${fileExt}`;
        const formData = new FormData();
        formData.append('file', {
          uri: Platform.OS === 'android' ? localAvatar.uri : localAvatar.uri.replace('file://', ''),
          name: filePath,
          type: contentType,
        });
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, formData, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }
      const updates = { id: session.user.id, full_name: fullName, phone: phone, avatar_url: newAvatarUrl, updated_at: new Date() };
      const { error: updateError } = await supabase.from('profiles').upsert(updates);
      if (updateError) throw updateError;
      Alert.alert(t('common.success'), t('settings.profileSaved'));
      setLocalAvatar(null);
      setAvatarUrl(newAvatarUrl);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (newPassword) => {
      setIsPasswordSaving(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setIsPasswordSaving(false);
      if (error) {
          Alert.alert(t('common.error'), error.message);
      } else {
          Alert.alert(t('common.success'), t('settings.passwordChangedSuccess'));
          setPasswordModalVisible(false);
      }
  };

  const handleLanguageChange = (lang) => { i18n.changeLanguage(lang); setLanguageModalVisible(false); };
  const toggleEdit = (fieldName) => { setEditingField(prev => (prev === fieldName ? null : fieldName)); };
  const handleLogout = () => { Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.confirm'), onPress: signOut, style: 'destructive' }]); };
  const getDisplayAvatar = () => {
    if (localAvatar) return { uri: localAvatar.uri };
    if (avatarUrl) return { uri: avatarUrl };
    return require('../assets/default-avatar.png');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={isLanguageModalVisible} onRequestClose={() => setLanguageModalVisible(false)} transparent={true} animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}><View style={styles.avatarModalContent}><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('uk')}><Text style={styles.langButtonText}>Українська</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('en')}><Text style={styles.langButtonText}>English</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('ro')}><Text style={styles.langButtonText}>Română</Text></TouchableOpacity></View></Pressable>
      </Modal>
      <AvatarSelectionModal visible={isAvatarModalVisible} onClose={() => setAvatarModalVisible(false)} onPickFromGallery={pickImage} onSelectPreset={handleSelectPresetAvatar} />
      <ChangePasswordModal visible={isPasswordModalVisible} onClose={() => setPasswordModalVisible(false)} onSave={handleChangePassword} isSaving={isPasswordSaving} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <Logo width={40} height={40} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 50 }}/>
        ) : (
          <>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
                <Image source={getDisplayAvatar()} style={styles.avatar} />
                <View style={styles.changeButton}><Ionicons name="camera-outline" size={20} color="#FFFFFF" /></View>
              </TouchableOpacity>
            </View>
            <View style={styles.form}>
              <EditableField labelKey="registration.fullNameLabel" icon="person-outline" value={fullName} onChangeText={setFullName} isEditing={editingField === 'fullName'} onToggleEdit={() => toggleEdit('fullName')} />
              <EditableField labelKey="registration.phoneLabel" icon="call-outline" value={phone} onChangeText={setPhone} isEditing={editingField === 'phone'} onToggleEdit={() => toggleEdit('phone')} />
              <EditableField labelKey="settings.language" icon="language-outline" value={t(`settings.${i18n.language}`)} onToggleEdit={() => setLanguageModalVisible(true)} />
              <ReadOnlyField labelKey="registration.emailLabel" icon="mail-outline" value={session?.user?.email} />
              <PasswordField labelKey="registration.passwordLabel" icon="lock-closed-outline" onNavigate={() => setPasswordModalVisible(true)} />
            </View>
            <ThemeSwitcher />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" /><Text style={styles.saveButtonText}>{t('settings.saveProfile')}</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          <Text style={styles.logoutButtonText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    scrollContainer: { paddingHorizontal: 24, paddingBottom: 20 },
    avatarContainer: { alignItems: 'center', marginVertical: 24, position: 'relative' },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
    changeButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: colors.background },
    form: { marginBottom: 24 },
    fieldContainer: { marginBottom: 16 },
    label: { color: colors.secondaryText, fontSize: 14, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 50 },
    inputIcon: { marginRight: 12 },
    inputText: { flex: 1, color: colors.text, fontSize: 16 },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    saveButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    logoutButton: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    logoutButtonText: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    avatarModalContent: { backgroundColor: colors.card, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 24 },
    presetAvatarsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 24 },
    presetAvatarCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    galleryButton: { flexDirection: 'row', backgroundColor: `${colors.primary}20`, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 10 },
    galleryButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
    modalInput: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, width: '100%', padding: 14, fontSize: 16, color: colors.text, marginBottom: 16 },
    langButton: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    langButtonText: { color: colors.text, fontSize: 18, textAlign: 'center' },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    switchContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 4 },
    switchIconContainer: { padding: 6, borderRadius: 16 },
    switchIconActive: { backgroundColor: colors.card },
});