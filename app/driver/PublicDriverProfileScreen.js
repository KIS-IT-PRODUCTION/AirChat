import React, { useState, useCallback, useMemo, memo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../../provider/AuthContext';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import moment from 'moment';

// --- Компоненти (без змін) ---
const StatCard = memo(({ icon, value, label, colors }) => {
    const styles = getStyles(colors);
    return ( <View style={styles.statItem}><Ionicons name={icon} size={28} color={colors.primary} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View> );
});
const InfoRow = memo(({ icon, label, value }) => {
    const { colors } = useTheme(); const styles = getStyles(colors); if (!value) return null;
    return ( <View style={styles.infoRow}><Ionicons name={icon} size={22} color={colors.secondaryText} style={styles.infoRowIcon} /><View><Text style={styles.infoRowLabel}>{label}</Text><Text style={styles.infoRowValue}>{value}</Text></View></View> );
});
const PassengerProfileInfo = ({ onGoBack }) => {
    const { colors } = useTheme(); const { t } = useTranslation(); const styles = getStyles(colors);
    return ( <SafeAreaView style={styles.container}><View style={styles.header}><TouchableOpacity onPress={onGoBack}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity><Text style={styles.headerTitle}>{t('profile.passengerProfileTitle')}</Text><View style={{ width: 40 }} /></View><View style={styles.content}><Ionicons name="people-outline" size={80} color={colors.secondaryText} style={{ marginBottom: 20 }} /><Text style={styles.infoTitle}>{t('profile.passengerInfoTitle')}</Text><Text style={styles.infoText}>{t('profile.passengerInfoBody')}</Text><TouchableOpacity style={styles.backButton} onPress={onGoBack}><Text style={styles.backButtonText}>{t('common.back')}</Text></TouchableOpacity></View></SafeAreaView> );
};
const AdminProfileInfo = ({ profile, onGoBack }) => {
    const { colors } = useTheme(); 
    const { t } = useTranslation(); 
    const styles = getStyles(colors);
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onGoBack}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.adminProfileTitle', 'Профіль Адміністратора')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={[styles.profileCard, { borderColor: colors.primary, borderWidth: 1.5 }]}>
                    <Image 
                        source={profile.avatar_url ? { uri: profile.avatar_url } : require('../../assets/default-avatar.png')} 
                        style={styles.avatar} 
                        contentFit="cover"
                        transition={300}
                        cachePolicy="disk" 
                    />
                    <Text style={styles.fullName}>{profile.full_name}</Text>
                    <View style={styles.adminBadge}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                        <Text style={styles.adminBadgeText}>{t('profile.administrator', 'Адміністратор')}</Text>
                    </View>
                    <Text style={styles.adminInfoText}>{t('profile.adminInfoBody', 'Це офіційний акаунт адміністрації. Зв\'яжіться з нами, якщо у вас виникли проблеми.')}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};


// --- Основний компонент екрана ---
export default function PublicDriverProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const { driverId } = route.params;
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isPassenger, setIsPassenger] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const isMyProfile = useMemo(() => session?.user?.id === driverId, [session, driverId]);

  const calculateTimeInApp = (joinDate) => {
    if (!joinDate) return `0 ${t('profile.years')}`;
    const years = moment().diff(moment(joinDate), 'years');
    if (years > 0) return `${years} ${t('profile.year', { count: years })}`;
    const months = moment().diff(moment(joinDate), 'months');
    if (months > 0) return `${months} ${t('profile.month', { count: months })}`;
    return `< 1 ${t('profile.month_one')}`;
  };

  // --- 👇 ФУНКЦІЯ FETCHPROFILE DATA ТЕПЕР ВИКЛИКАЄ RPC 👇 ---
  const fetchProfileData = useCallback(async () => {
    if (!driverId) { setLoading(false); return; }
    
    setLoading(true);
    setIsPassenger(false);
    setIsAdmin(false); 
    setProfile(null);

    try {
      // ЗАПИТ 1: Отримуємо основні дані профілю
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            *, 
            driver_profiles (*) 
        `)
        .eq('id', driverId)
        .maybeSingle(); 

      if (error) throw error;

      if (!data) {
        setProfile(null); // Не знайдено
      } else if (data.role === 'client') {
        setIsPassenger(true); // Це пасажир
      } else if (data.role === 'admin') {
        setIsAdmin(true);
        setProfile({
            id: data.id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
        });
      } else if (data.role === 'driver') {
        
        // ✅ ЗАПИТ 2: Отримуємо статистику (кількість поїздок)
        // Викликаємо нову SQL-функцію, яку ми створили у Кроці 1
        const { data: stats, error: statsError } = await supabase
          .rpc('get_public_driver_stats', { p_driver_id: driverId })
          .single();

        if (statsError) throw statsError;

        // Збираємо повні дані
        setProfile({
            id: data.id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            phone: data.phone,
            member_since: data.created_at,
            car_make: data.driver_profiles?.car_make,
            car_model: data.driver_profiles?.car_model,
            car_plate: data.driver_profiles?.car_plate,
            experience_years: data.driver_profiles?.experience_years,
            // Використовуємо пораховане значення з RPC-дзвінка
            completed_trips: stats.completed_trips_count 
        });
      } else {
        setProfile(null); // Невідома роль
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.message);
    } finally {
      setLoading(false);
    }
  }, [driverId, t]);

  // ❗️ МИ ПОВНІСТЮ ВИДАЛИЛИ СТАРУ ФУНКЦІЮ 'fetchCompletedTripsCount',
  // тому що вона більше не потрібна. 
  // Вся логіка тепер на сервері.

  useFocusEffect(useCallback(() => { fetchProfileData(); }, [fetchProfileData]));

 // --- (Решта файлу: handleCall, handleMessage, рендеринг - БЕЗ ЗМІН) ---
 
 const handleCall = () => {
    if (!profile?.phone) {
        Alert.alert(t('common.error'), t('profile.noPhoneDriver'));
        return;
    }
    Alert.alert(
        t('profile.confirmCallTitle'),
        profile.phone,
        [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.call'), onPress: () => Linking.openURL(`tel:${profile.phone}`) }
        ]
    );
  };

  const handleMessage = async () => {
    if (!session?.user) {
        Alert.alert(t('common.error'), t('profile.loginToWrite'));
        return;
    }
    try {
        const { data: roomId, error } = await supabase.rpc('find_or_create_chat_room', { p_recipient_id: driverId });
        if (error) throw error;
        
        navigation.navigate('IndividualChat', {
            roomId,
            recipientId: driverId,
            recipientName: profile.full_name,
            recipientAvatar: profile.avatar_url,
        });

    } catch (error) { 
        Alert.alert(t('common.error'), error.message); 
    }
  };
  
  if (loading) {
    return (
        <SafeAreaView style={styles.container}>
             <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.loadingProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
        </SafeAreaView>
    );
  }
  
  if (isPassenger) {
    return <PassengerProfileInfo onGoBack={() => navigation.goBack()} />;
  }
  
  if (isAdmin && profile) {
    return <AdminProfileInfo profile={profile} onGoBack={() => navigation.goBack()} />;
  }

  if (!profile) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.driverProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={styles.content}>
                <Ionicons name="person-remove-outline" size={64} color={colors.secondaryText} style={{ marginBottom: 16 }} />
                <Text style={styles.text}>{t('profile.driverNotFound', 'Профіль водія не знайдено або видалено.')}</Text>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back-circle" size={40} color={colors.primary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{isMyProfile ? t('profile.yourPublicProfile') : profile.full_name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <Image source={profile.avatar_url ? { uri: profile.avatar_url } : require('../../assets/default-avatar.png')} style={styles.avatar} contentFit="cover" transition={300} cachePolicy="disk" />
          <Text style={styles.fullName}>{profile.full_name}</Text>
          {!isMyProfile && ( <View style={styles.actionsContainer}><TouchableOpacity style={styles.actionButton} onPress={handleMessage}><Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} /><Text style={styles.actionButtonText}>{t('profile.message')}</Text></TouchableOpacity><TouchableOpacity style={styles.actionButton} onPress={handleCall}><Ionicons name="call-outline" size={24} color={colors.primary} /><Text style={styles.actionButtonText}>{t('profile.call')}</Text></TouchableOpacity></View> )}
        </View>

        <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('profile.carInfo')}</Text>
            <InfoRow label={t('profile.carMake')} value={profile.car_make || t('settings.notSet')} icon="car-sport-outline" />
            <View style={styles.divider} />
            <InfoRow label={t('profile.carModel')} value={profile.car_model || t('settings.notSet')} icon="car-outline" />
            <View style={styles.divider} />
            <InfoRow label={t('profile.carPlate')} value={profile.car_plate || t('settings.notSet')} icon="reader-outline" />
        </View>

        <View style={styles.statsContainer}>
            <StatCard icon="id-card-outline" value={profile.experience_years ? `${profile.experience_years} ${t('profile.year', { count: profile.experience_years })}` : `0 ${t('profile.years')}`} label={t('profile.experience')} colors={colors} />
            <StatCard icon="checkmark-done-circle-outline" value={profile.completed_trips} label={t('profile.completedTrips')} colors={colors} />
            <StatCard icon="time-outline" value={calculateTimeInApp(profile.member_since)} label={t('profile.inApp')} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Стилі (без змін) ---
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center', flex: 1, marginHorizontal: 10 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    text: { fontSize: 18, color: colors.secondaryText, textAlign: 'center' },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
    fullName: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    infoCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginTop: 16, borderWidth: 1, borderColor: colors.border },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    infoRowIcon: { marginRight: 16 },
    infoRowLabel: { fontSize: 12, color: colors.secondaryText, marginBottom: 2 },
    infoRowValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 8 },
    statLabel: { color: colors.secondaryText, fontSize: 12, marginTop: 4, textAlign: 'center' },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
    actionButton: { alignItems: 'center', flex: 1 },
    actionButtonText: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 6 },
    infoTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 },
    infoText: { fontSize: 16, color: colors.secondaryText, textAlign: 'center', lineHeight: 24 },
    backButton: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
    backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.primary}20`,
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    adminBadgeText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    adminInfoText: {
        fontSize: 16,
        color: colors.secondaryText,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: 8,
    }
});