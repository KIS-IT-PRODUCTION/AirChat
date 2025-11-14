import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Pressable, Platform, ActivityIndicator,
  Switch
} from 'react-native';
// Image вже імпортовано, ми використаємо його для очищення кешу
import { Image } from 'expo-image'; 
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { MotiView } from 'moti';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../../provider/AuthContext';
import { supabase } from '../../config/supabase';
import Logo from '../../assets/icon.svg';

// --- Компоненти (без змін) ---
const EditableField = ({ labelKey, icon, value, isEditing, onToggleEdit, onChangeText, keyboardType = 'default' }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}><Text style={styles.label}>{t(labelKey)}</Text><View style={styles.inputWrapper}><Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />{isEditing ? (<TextInput style={styles.inputText} value={value} onChangeText={onChangeText} autoFocus={true} keyboardType={keyboardType} />) : (<Text style={styles.inputText} numberOfLines={1}>{value || t('settings.notSet')}</Text>)}<TouchableOpacity onPress={onToggleEdit}><Ionicons name={isEditing ? "checkmark-circle" : "create-outline"} size={24} color={isEditing ? colors.primary : colors.secondaryText} /></TouchableOpacity></View></View>
    );
};
const ReadOnlyField = ({ labelKey, icon, value }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}><Text style={styles.label}>{t(labelKey)}</Text><View style={styles.inputWrapper}><Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} /><Text style={[styles.inputText, { opacity: 0.7 }]}>{value}</Text></View></View>
    );
};
const PasswordField = ({ onNavigate }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}><Text style={styles.label}>{t('registration.passwordLabel')}</Text><TouchableOpacity style={styles.inputWrapper} onPress={onNavigate}><Ionicons name="lock-closed-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} /><Text style={styles.inputText}>••••••••</Text><Ionicons name="chevron-forward-outline" size={24} color={colors.secondaryText} /></TouchableOpacity></View>
    );
};
const CacheField = ({ onNavigate }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('settings.cache', 'Кеш')}</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={onNavigate}>
                <Ionicons name="trash-outline" size={20} color={colors.secondaryText} style={styles.inputIcon} />
                <Text style={styles.inputText}>{t('settings.clearImageCache', 'Очистити кеш зображень')}</Text>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
    );
};
const ThemeSwitcher = () => {
    const { colors, theme, toggleTheme } = useTheme(); const styles = getStyles(colors); const { t } = useTranslation(); const isDark = theme === 'dark';
    return (
        <View style={styles.themeContainer}><Text style={styles.label}>{t('settings.darkTheme')}</Text><TouchableOpacity onPress={toggleTheme} style={styles.themeSwitchTrack}><MotiView style={styles.themeSwitchThumb} animate={{ translateX: isDark ? 36 : 0 }} transition={{ type: 'timing', duration: 250 }} /><View style={styles.themeIconContainer}><Ionicons name="sunny-outline" size={18} color={isDark ? colors.secondaryText : colors.primary} /><Ionicons name="moon-outline" size={18} color={isDark ? colors.primary : colors.secondaryText} /></View></TouchableOpacity></View>
    );
};

// --- Модальні вікна (без змін) ---
const AvatarSelectionModal = ({ visible, onClose, onPickFromGallery, onSelectPreset, fullName }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    const presetAvatars = [
        { id: 'male', name: fullName || 'John Doe', bgColor: 'b6e3f4' },
        { id: 'female', name: fullName || 'Jane Doe', bgColor: 'ffdfbf' },
    ];
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <View style={styles.avatarModalContent}><Text style={styles.modalTitle}>{t('settings.avatarModalTitle')}</Text><View style={styles.presetAvatarsContainer}>{presetAvatars.map(avatar => (<TouchableOpacity key={avatar.id} style={[styles.presetAvatarCircle, { backgroundColor: `#${avatar.bgColor}` }]} onPress={() => onSelectPreset(avatar)}><Image source={{ uri: `https://api.dicebear.com/8.x/initials/png?seed=${encodeURIComponent(avatar.name)}&backgroundColor=${avatar.bgColor}`}} style={styles.presetAvatarImage} /></TouchableOpacity>))}</View><TouchableOpacity style={styles.galleryButton} onPress={onPickFromGallery}><Ionicons name="images-outline" size={24} color={colors.primary} /><Text style={styles.galleryButtonText}>{t('settings.pickFromGallery')}</Text></TouchableOpacity></View>
            </Pressable>
        </Modal>
    );
};
const ChangePasswordModal = ({ visible, onClose, onSave, isSaving }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
    const handleSave = () => { if (newPassword.length < 6) { Alert.alert(t('common.error'), t('settings.passwordTooShort')); return; } if (newPassword !== confirmPassword) { Alert.alert(t('common.error'), t('settings.passwordsDoNotMatch')); return; } onSave(newPassword); };
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <Pressable style={styles.modalBackdrop} onPress={onClose}><View style={styles.avatarModalContent}><Text style={styles.modalTitle}>{t('settings.changePassword')}</Text><TextInput style={styles.modalInput} placeholder={t('settings.newPassword')} placeholderTextColor={colors.secondaryText} secureTextEntry value={newPassword} onChangeText={setNewPassword} /><TextInput style={styles.modalInput} placeholder={t('settings.confirmNewPassword')} placeholderTextColor={colors.secondaryText} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} /><TouchableOpacity style={styles.galleryButton} onPress={handleSave} disabled={isSaving}>{isSaving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.galleryButtonText}>{t('settings.savePassword')}</Text>}</TouchableOpacity></View></Pressable>
        </Modal>
    );
};

// --- Основний компонент ---
const DriverSettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { session, signOut, profile: authProfile, switchRole } = useAuth();
  const styles = getStyles(colors);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false); 
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [localAvatarUri, setLocalAvatarUri] = useState(null); 
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [experience, setExperience] = useState('');
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  
  const handleLanguageChange = useCallback((lang) => {
    i18n.changeLanguage(lang);
    setLanguageModalVisible(false);
}, [i18n]);

  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('profiles').select('*, driver_profiles(*)').eq('id', session.user.id).single();
      if (error) throw error;
      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);
        const driverData = data.driver_profiles;
        if (driverData) {
          setCarMake(driverData.car_make || '');
          setCarModel(driverData.car_model || '');
          setCarPlate(driverData.car_plate || '');
          setExperience(driverData.experience_years?.toString() || '');
        }
      }
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  
  const pickImage = useCallback(async () => {
    setAvatarModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('common.error'), t('settings.galleryPermissionError')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) { setLocalAvatarUri(result.assets[0].uri); setAvatarUrl(null); }
  }, [t]);

  const handleSelectPresetAvatar = useCallback((avatar) => {
    const newUrl = `https://api.dicebear.com/8.x/initials/png?seed=${encodeURIComponent(avatar.name)}&backgroundColor=${avatar.bgColor}`;
    setAvatarUrl(newUrl);
    setLocalAvatarUri(null);
    setAvatarModalVisible(false);
  }, []);
  
  const handleSaveChanges = useCallback(async () => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      if (localAvatarUri) {
        const base64 = await FileSystem.readAsStringAsync(localAvatarUri, { encoding: 'base64' });
        const fileExt = localAvatarUri.split('.').pop().toLowerCase();
        const filePath = `${session.user.id}.${fileExt}`;
        const contentType = `image/${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, decode(base64), { contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }
      const profileUpdates = { id: session.user.id, full_name: fullName, phone, avatar_url: finalAvatarUrl, updated_at: new Date() };
      const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
      if (profileError) throw profileError;
      const driverUpdates = { id: session.user.id, car_make: carMake, car_model: carModel, car_plate: carPlate, experience_years: parseInt(experience, 10) || 0 };
      const { error: driverError } = await supabase.from('driver_profiles').upsert(driverUpdates);
      if (driverError) throw driverError;
      Alert.alert(t('common.success'), t('settings.profileSaved'));
      setLocalAvatarUri(null);
      setAvatarUrl(finalAvatarUrl);
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setIsSaving(false); }
  }, [session, avatarUrl, localAvatarUri, fullName, phone, carMake, carModel, carPlate, experience, t]);

  const handleChangePassword = useCallback(async (newPassword) => {
      setIsPasswordSaving(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setIsPasswordSaving(false);
      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.success'), t('settings.passwordChangedSuccess'));
        setPasswordModalVisible(false);
      }
  }, [t]);

  const handleClearCache = useCallback(async () => {
    try {
      await Image.clearDiskCache();
      await Image.clearMemoryCache();
      Alert.alert(t('common.success'), t('settings.cacheCleared', 'Кеш зображень очищено'));
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  }, [t]);

  const handleRoleSwitch = useCallback(async (isDriverMode) => {
    const newRole = isDriverMode ? 'driver' : 'client';
    if (newRole === authProfile?.role) return; 
    setIsSwitchingRole(true);
    const { success, error } = await switchRole(newRole);
    if (!success) {
      Alert.alert(t('common.error'), error);
    }
    setIsSwitchingRole(false);
  }, [switchRole, authProfile, t]);
  
  const handleLogout = useCallback(() => {
    Alert.alert(
        t('settings.logout'), 
        t('settings.logoutConfirm'), 
        [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), onPress: signOut, style: 'destructive' }
        ]
    );
  }, [signOut, t]);

  // --- 👇 НОВА ФУНКЦІЯ ВИДАЛЕННЯ АКАУНТУ (Вимога Apple 5.1.1) 👇 ---
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
        t('settings.deleteAccountTitle', 'Видалити акаунт?'),
        t('settings.deleteAccountBody', 'Ця дія є незворотною. Всі ваші дані, чати та трансфери будуть назавжди видалені. Ви впевнені?'),
        [
            { text: t('common.cancel', 'Скасувати'), style: 'cancel' },
            {
                text: t('common.delete', 'Видалити'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        // 1. Викликаємо SQL-функцію, яку ви створили в Supabase
                        const { error } = await supabase.rpc('delete_my_account');
                        
                        if (error) {
                          throw error;
                        }
                        
                        // 2. Повідомляємо про успіх
                        Alert.alert(
                          t('settings.deleteSuccessTitle', 'Акаунт видалено'),
                          t('settings.deleteSuccessBody', 'Ваш акаунт було успішно видалено.')
                        );
                        
                        // 3. Виходимо з системи
                        await signOut();
                        
                    } catch (error) {
                      Alert.alert(
                        t('common.error', 'Помилка'), 
                        t('settings.deleteError', 'Не вдалося видалити акаунт: ') + error.message
                      );
                    }
                },
            },
        ]
    );
  }, [signOut, t]); // Додаємо signOut і t в залежності
  // --- 👆 КІНЕЦЬ НОВОЇ ФУНКЦІЇ 👆 ---

  const toggleEdit = (fieldName) => setEditingField(prev => (prev === fieldName ? null : fieldName));
  const getDisplayAvatar = useCallback(() => {
    if (localAvatarUri) return { uri: localAvatarUri };
    if (avatarUrl) return { uri: avatarUrl };
    return require('../../assets/default-avatar.png');
  }, [localAvatarUri, avatarUrl]);

  return (
    
    <SafeAreaView style={styles.container}>
      {/* ... (код модальних вікон без змін) ... */}
      <Modal
        visible={isLanguageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
        transparent={true}
        animationType="slide"
    >
        <Pressable
            style={styles.modalBackdrop}
            onPress={() => setLanguageModalVisible(false)}
        >
            <View style={styles.avatarModalContent}>
                <TouchableOpacity
                    style={styles.langButton}
                    onPress={() => handleLanguageChange('uk')}
                >
                    <Text style={styles.langButtonText}>Українська</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.langButton}
                    onPress={() => handleLanguageChange('en')}
                >
                    <Text style={styles.langButtonText}>English</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.langButton}
                    onPress={() => handleLanguageChange('ro')}
                >
                    <Text style={styles.langButtonText}>Română</Text>
                </TouchableOpacity>
            </View>
        </Pressable>
    </Modal>
      <AvatarSelectionModal visible={isAvatarModalVisible} onClose={() => setAvatarModalVisible(false)} onPickFromGallery={pickImage} onSelectPreset={handleSelectPresetAvatar} fullName={fullName} />
      <ChangePasswordModal visible={isPasswordModalVisible} onClose={() => setPasswordModalVisible(false)} onSave={handleChangePassword} isSaving={isPasswordSaving} />
      
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity><Text style={styles.headerTitle}>{t('settings.title')}</Text><Logo width={40} height={40} /></View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? ( <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 50 }}/> ) : (
          <>
            <View style={styles.avatarContainer}><TouchableOpacity onPress={() => setAvatarModalVisible(true)}><Image source={getDisplayAvatar()} style={styles.avatar} cachePolicy="disk" transition={300} /><View style={styles.changeButton}><Ionicons name="camera-outline" size={20} color="#FFFFFF" /></View></TouchableOpacity></View>
            <View style={styles.form}>
              {authProfile?.is_driver && (
                <>
                  <Text style={styles.sectionTitle}>{t('settings.modeSwitchTitle')}</Text>
                  <View style={styles.switchRow}>
                    <Ionicons name="person-outline" size={24} color={colors.secondaryText} style={{ opacity: authProfile.role === 'client' ? 1 : 0.5 }} />
                    <Switch
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.card}
                        onValueChange={handleRoleSwitch}
                        value={authProfile.role === 'driver'}
                        disabled={isSwitchingRole} 
                    />
                    <Ionicons name="car-sport-outline" size={24} color={colors.secondaryText} style={{ opacity: authProfile.role === 'driver' ? 1 : 0.5 }} />
                  </View>
                  {isSwitchingRole && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
                  <Text style={styles.switchLabel}>{authProfile.role === 'driver' ? t('settings.driverModeActive') : t('settings.passengerModeActive')}</Text>
                </>
              )}
              <Text style={styles.sectionTitle}>{t('settings.personalInfo')}</Text>
              <EditableField labelKey="registration.fullNameLabel" icon="person-outline" value={fullName} onChangeText={setFullName} isEditing={editingField === 'fullName'} onToggleEdit={() => toggleEdit('fullName')} />
              <EditableField labelKey="registration.phoneLabel" icon="call-outline" value={phone} onChangeText={setPhone} isEditing={editingField === 'phone'} onToggleEdit={() => toggleEdit('phone')} keyboardType="phone-pad" />
              
              {/* Секція Водія (показуємо тільки в режимі водія) */}
              {authProfile.role === 'driver' && (
                <>
                  <Text style={styles.sectionTitle}>{t('settings.carInfo')}</Text>
                  <EditableField labelKey="settings.carMake" icon="car-sport-outline" value={carMake} onChangeText={setCarMake} isEditing={editingField === 'carMake'} onToggleEdit={() => toggleEdit('carMake')} />
                  <EditableField labelKey="settings.carModel" icon="car-outline" value={carModel} onChangeText={setCarModel} isEditing={editingField === 'carModel'} onToggleEdit={() => toggleEdit('carModel')} />
                  <EditableField labelKey="settings.carPlate" icon="reader-outline" value={carPlate} onChangeText={setCarPlate} isEditing={editingField === 'carPlate'} onToggleEdit={() => toggleEdit('carPlate')} />
                  <EditableField labelKey="settings.experience" icon="ribbon-outline" value={experience} onChangeText={setExperience} isEditing={editingField === 'experience'} onToggleEdit={() => toggleEdit('experience')} keyboardType="numeric" />
                </>
              )}
                
              <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
              <EditableField
                labelKey="settings.language"
                icon="language-outline"
                value={t(`settings.${i18n.language}`)}
                onToggleEdit={() => setLanguageModalVisible(true)} 
              />
              <ReadOnlyField labelKey="registration.emailLabel" icon="mail-outline" value={session?.user?.email} />
              <PasswordField onNavigate={() => setPasswordModalVisible(true)} />
              
              <CacheField onNavigate={handleClearCache} />
            </View>
            <ThemeSwitcher />
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-bin-outline" size={22} color={colors.danger} />
            <Text style={styles.deleteButtonText}>{t('settings.deleteAccount', 'Видалити акаунт назавжди')}</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" /><Text style={styles.saveButtonText}>{t('settings.saveProfile')}</Text></>}</TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color={colors.primary} /><Text style={styles.logoutButtonText}>{t('settings.logout')}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default memo(DriverSettingsScreen);

// --- Стилі ---
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
    scrollContainer: { paddingHorizontal: 24, paddingBottom: 20 },
    avatarContainer: { alignItems: 'center', marginVertical: 24, position: 'relative' },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
    changeButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, borderRadius: 20, padding: 8, borderWidth: 2, borderColor: colors.background },
    form: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
    fieldContainer: { marginBottom: 16 },
    label: { color: colors.secondaryText, fontSize: 14, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 50 },
    inputIcon: { marginRight: 12 },
    inputText: { flex: 1, color: colors.text, fontSize: 16 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.card, paddingVertical: 8, borderRadius: 16 },
    switchLabel: { textAlign: 'center', color: colors.secondaryText, marginTop: 8, fontSize: 12 },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    saveButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    logoutButton: { flexDirection: 'row', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    logoutButtonText: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
    
    // --- 👇 НОВІ СТИЛІ ДЛЯ КНОПКИ ВИДАЛЕННЯ 👇 ---
    deleteButton: {
        flexDirection: 'row',
        backgroundColor: 'transparent', // Прозорий фон
        borderRadius: 12,
        paddingVertical: 14, // Трохи менше, ніж у кнопки "Вийти"
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8, // Невеликий відступ від кнопки "Вийти"
    },
    deleteButtonText: {
        color: colors.danger, // Червоний колір з вашої теми
        fontSize: 16, // Трохи менший шрифт
        fontWeight: 'bold',
    },
    // --- 👆 КІНЕЦЬ НОВИХ СТИЛІВ 👆 ---
    
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    avatarModalContent: { backgroundColor: colors.card, padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 24 },
    presetAvatarsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 24 },
    presetAvatarCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    presetAvatarImage: { width: '100%', height: '100%' },
    galleryButton: { flexDirection: 'row', backgroundColor: `${colors.primary}20`, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 10 },
    galleryButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
    modalInput: { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, width: '100%', padding: 14, fontSize: 16, color: colors.text, marginBottom: 16 },
    themeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
    themeSwitchTrack: { width: 70, height: 34, borderRadius: 17, backgroundColor: colors.background, justifyContent: 'center', padding: 4 },
    themeSwitchThumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, position: 'absolute', top: 4, left: 4 },
    themeIconContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
    
    langButton: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border, 
        width: '100%'
    },
    langButtonText: {
        color: colors.text, 
        fontSize: 18,
        textAlign: 'center'
    }
});