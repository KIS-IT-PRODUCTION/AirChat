// app/DriverSettingsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView,
  TextInput, Alert, Modal, Pressable, LayoutAnimation, UIManager, Platform, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../../provider/AuthContext';
import { supabase } from '../../config/supabase';
import Logo from '../../assets/icon.svg';

// ... (Всі допоміжні компоненти, такі як EditableField, ThemeSwitcher, залишаються такими ж) ...
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) { UIManager.setLayoutAnimationEnabledExperimental(true); }
const EditableField=({labelKey,icon,value,isEditing,onToggleEdit,onChangeText,keyboardType='default'})=>{const{colors}=useTheme();const{t}=useTranslation();const styles=getStyles(colors);return(<View style={styles.fieldContainer}><Text style={styles.label}>{t(labelKey)}</Text><View style={styles.inputWrapper}><Ionicons name={icon} size={20} color={colors.secondaryText} style={styles.inputIcon} />{isEditing?(<TextInput style={styles.inputText} value={value} onChangeText={onChangeText} autoFocus={true} keyboardType={keyboardType} />):(<Text style={styles.inputText} numberOfLines={1}>{value}</Text>)}<TouchableOpacity onPress={onToggleEdit}><Ionicons name={isEditing?"checkmark-circle-outline":"create-outline"} size={24} color={isEditing?colors.primary:colors.secondaryText} /></TouchableOpacity></View></View>);};
const ThemeSwitcher=()=>{const{colors,theme,toggleTheme}=useTheme();const styles=getStyles(colors);const{t}=useTranslation();const handlePress=()=>{LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);toggleTheme();};return(<View style={styles.themeRow}><Text style={styles.label}>{t('settings.darkTheme')}</Text><TouchableOpacity onPress={handlePress} style={styles.switchContainer}><View style={[styles.switchIconContainer,theme==='light'&&styles.switchIconActive]}><Ionicons name="sunny-outline" size={18} color={theme==='light'?colors.primary:colors.secondaryText} /></View><View style={[styles.switchIconContainer,theme==='dark'&&styles.switchIconActive]}><Ionicons name="moon-outline" size={18} color={theme==='dark'?colors.primary:colors.secondaryText} /></View></TouchableOpacity></View>);};


export default function DriverSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuth();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  
  // Стани для даних профілю
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [localAvatar, setLocalAvatar] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  // ✨ НОВІ СТАНИ ДЛЯ ВОДІЯ
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [experience, setExperience] = useState('');

  // Завантаження даних профілю з Supabase
  const fetchProfile = useCallback(async () => {
    if (!session?.user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          full_name, phone, avatar_url,
          driver_profiles ( car_make, car_model, car_plate, experience_years )
        `)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatar_url || null);
        
        const driverData = data.driver_profiles[0] || {};
        setCarMake(driverData.car_make || '');
        setCarModel(driverData.car_model || '');
        setCarPlate(driverData.car_plate || '');
        setExperience(driverData.experience_years?.toString() || '');
      }
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setLoading(false); }
  }, [session, t]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (!result.canceled) { setLocalAvatar(result.assets[0]); }
  };

  // ✨ ОНОВЛЕНА ФУНКЦІЯ ЗБЕРЕЖЕННЯ
  const handleSaveChanges = async () => {
    if (!session?.user) return;
    setLoading(true);

    try {
      // Крок 1: Оновлення аватара (якщо є)
      let newAvatarUrl = avatarUrl;
      if (localAvatar) {
        const fileExt = localAvatar.uri.split('.').pop().toLowerCase();
        const filePath = `${session.user.id}.${fileExt}`;
        const contentType = localAvatar.mimeType || `image/${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, decode(localAvatar.base64), { contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      }

      // Крок 2: Оновлення даних в таблиці 'profiles'
      const profileUpdates = { id: session.user.id, full_name: fullName, phone: phone, avatar_url: newAvatarUrl, updated_at: new Date() };
      const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
      if (profileError) throw profileError;
      
      // Крок 3: Оновлення даних в таблиці 'driver_profiles'
      const driverUpdates = { id: session.user.id, car_make: carMake, car_model: carModel, car_plate: carPlate, experience_years: parseInt(experience, 10) || 0 };
      const { error: driverError } = await supabase.from('driver_profiles').upsert(driverUpdates);
      if (driverError) throw driverError;

      Alert.alert(t('common.success'), t('settings.profileSaved'));
      setLocalAvatar(null);
      fetchProfile(); // Оновлюємо дані на екрані
    } catch (error) { Alert.alert(t('common.error'), error.message); } 
    finally { setLoading(false); }
  };

  // ... (решта хендлерів без змін)
  const handleLanguageChange = (lang) => { i18n.changeLanguage(lang); setLanguageModalVisible(false); };
  const toggleEdit = (fieldName) => { setEditingField(prev => (prev === fieldName ? null : fieldName)); };
  const handleLogout = () => { Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.confirm'), onPress: signOut, style: 'destructive' }]); };
  const getDisplayAvatar = () => { if (localAvatar) return { uri: localAvatar.uri }; if (avatarUrl) return { uri: avatarUrl }; return require('../../assets/default-avatar.jpg'); };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... (модальне вікно та хедер без змін) ... */}
      <Modal visible={isLanguageModalVisible} onRequestClose={() => setLanguageModalVisible(false)} transparent={true} animationType="slide"><Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}><View style={styles.modalContent}><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('uk')}><Text style={styles.langButtonText}>Українська</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('en')}><Text style={styles.langButtonText}>English</Text></TouchableOpacity><TouchableOpacity style={styles.langButton} onPress={() => handleLanguageChange('ro')}><Text style={styles.langButtonText}>Română</Text></TouchableOpacity></View></Pressable></Modal>
      <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity><Text style={styles.headerTitle}>{t('settings.title')}</Text><Logo width={40} height={40} /></View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading && !getDisplayAvatar().uri ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 50 }}/>
        ) : (
          <>
            <View style={styles.avatarContainer}><Image source={getDisplayAvatar()} style={styles.avatar} /><TouchableOpacity style={styles.changeButton} onPress={pickImage}><Text style={styles.changeButtonText}>{t('settings.changePhoto')}</Text><Ionicons name="image-outline" size={16} color="#FFFFFF" /></TouchableOpacity></View>

            <View style={styles.form}>
              <Text style={styles.sectionTitle}>{t('settings.personalInfo', 'Особиста інформація')}</Text>
              <EditableField labelKey="registration.fullNameLabel" icon="person-outline" value={fullName} onChangeText={setFullName} isEditing={editingField === 'fullName'} onToggleEdit={() => toggleEdit('fullName')} />
              <EditableField labelKey="registration.phoneLabel" icon="call-outline" value={phone} onChangeText={setPhone} isEditing={editingField === 'phone'} onToggleEdit={() => toggleEdit('phone')} keyboardType="phone-pad" />
              
              {/* ✨ НОВІ ПОЛЯ ДЛЯ ВОДІЯ */}
              <Text style={styles.sectionTitle}>{t('settings.carInfo', 'Інформація про авто')}</Text>
              <EditableField labelKey="settings.carMake" icon="car-sport-outline" value={carMake} onChangeText={setCarMake} isEditing={editingField === 'carMake'} onToggleEdit={() => toggleEdit('carMake')} />
              <EditableField labelKey="settings.carModel" icon="car-sport-outline" value={carModel} onChangeText={setCarModel} isEditing={editingField === 'carModel'} onToggleEdit={() => toggleEdit('carModel')} />
              <EditableField labelKey="settings.carPlate" icon="reader-outline" value={carPlate} onChangeText={setCarPlate} isEditing={editingField === 'carPlate'} onToggleEdit={() => toggleEdit('carPlate')} />
              <EditableField labelKey="settings.experience" icon="ribbon-outline" value={experience} onChangeText={setExperience} isEditing={editingField === 'experience'} onToggleEdit={() => toggleEdit('experience')} keyboardType="numeric" />

              <Text style={styles.sectionTitle}>{t('settings.account', 'Акаунт')}</Text>
              <EditableField labelKey="settings.language" icon="language-outline" value={t(`settings.${i18n.language}`)} onToggleEdit={() => setLanguageModalVisible(true)} />
              <EditableField labelKey="registration.emailLabel" icon="mail-outline" value={session?.user?.email} onToggleEdit={() => Alert.alert(t('settings.emailCannotBeChanged'))} />
              <EditableField labelKey="registration.passwordLabel" icon="lock-closed-outline" value={"••••••••"} onToggleEdit={() => {}} />
              <TouchableOpacity><Text style={styles.changePasswordLink}>{t('settings.changePassword')}</Text></TouchableOpacity>
            </View>
            
            <ThemeSwitcher />
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="save-outline" size={24} color="#FFFFFF" /><Text style={styles.saveButtonText}>{t('settings.saveProfile')}</Text></>}</TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#FFFFFF" /><Text style={styles.logoutButtonText}>{t('settings.logout')}</Text></TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Стилі залишаються такими ж, як у вашому прикладі, з додаванням sectionTitle
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backButton: { padding: 4 },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    scrollContainer: { paddingHorizontal: 24, paddingBottom: 40 },
    avatarContainer: { alignItems: 'center', marginVertical: 24 },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.card },
    changeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 16, gap: 8 },
    changeButtonText: { color: '#FFFFFF', fontWeight: '600' },
    form: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
    fieldContainer: { marginBottom: 16 },
    label: { color: colors.secondaryText, fontSize: 14, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 50 },
    inputIcon: { marginRight: 12 },
    inputText: { flex: 1, color: colors.text, fontSize: 16 },
    changePasswordLink: { color: colors.primary, textAlign: 'right', marginTop: 8, fontWeight: '600' },
    saveButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
    saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    logoutButton: { flexDirection: 'row', backgroundColor: '#D9534F', borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
    logoutButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { backgroundColor: colors.card, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
    langButton: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    langButtonText: { color: colors.text, fontSize: 18, textAlign: 'center' },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    switchContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 20, padding: 4 },
    switchIconContainer: { padding: 6, borderRadius: 16 },
    switchIconActive: { backgroundColor: colors.card },
});
