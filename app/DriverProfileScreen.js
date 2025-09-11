import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import moment from 'moment';

// Компонент для статистики
const StatCard = ({ icon, value, label, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.statItem}>
            <Ionicons name={icon} size={28} color={colors.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
};

// ✨ Компонент для зіркового рейтингу більше не потрібен, його можна видалити

export default function DriverProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const calculateTimeInApp = (joinDate) => {
    if (!joinDate) return `0 ${t('profile.years')}`;
    const years = moment().diff(moment(joinDate), 'years');
    if (years > 0) return `${years} ${t('profile.year', { count: years })}`;
    const months = moment().diff(moment(joinDate), 'months');
    if (months > 0) return `${months} ${t('profile.month', { count: months })}`;
    return `< 1 ${t('profile.month_one')}`;
  };

  const fetchProfileData = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_driver_profile_details', { p_driver_id: session.user.id })
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => { fetchProfileData(); }, [fetchProfileData]));

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} /></SafeAreaView>;
  }

  if (!profile) {
    return <SafeAreaView style={styles.container}><Text style={styles.fullName}>{t('profile.noData', 'Не вдалося завантажити профіль.')}</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Logo width={40} height={40} />
        <Text style={styles.headerTitle}>{t('profile.myProfile', 'Мій профіль')}</Text>
        <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')}>
          <Ionicons name="headset-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <Image 
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/default-avatar.png')} 
            style={styles.avatar} 
          />
          <Text style={styles.fullName}>{profile.full_name || t('profile.noName', 'Безіменний водій')}</Text>
          <Text style={styles.phone}>{profile.phone || t('profile.noPhone', 'Не вказано')}</Text>
        </View>

        <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('profile.carInfo', 'Автомобіль')}</Text>
            <View style={styles.carInfoRow}>
                <Ionicons name="car-sport-outline" size={24} color={colors.secondaryText} />
                <Text style={styles.carInfoText}>{profile.car_make || t('settings.notSet')} {profile.car_model || ''}</Text>
            </View>
            <View style={styles.carInfoRow}>
                <Ionicons name="reader-outline" size={24} color={colors.secondaryText} />
                <Text style={styles.carInfoText}>{profile.car_plate || t('settings.notSet')}</Text>
            </View>
        </View>

        {/* ✨ ОНОВЛЕНИЙ БЛОК СТАТИСТИКИ */}
        <View style={styles.statsContainer}>
            <StatCard 
                icon="id-card-outline" 
                value={profile.experience_years ? `${profile.experience_years} ${t('profile.year', { count: profile.experience_years })}` : `0 ${t('profile.years')}`}
                label={t('profile.experience', 'Досвід водіння')} 
                colors={colors} 
            />
            <StatCard icon="checkmark-done-circle-outline" value={profile.completed_trips || 0} label={t('profile.completedTrips')} colors={colors} />
            <StatCard icon="time-outline" value={calculateTimeInApp(profile.member_since)} label={t('profile.inApp')} colors={colors} />
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('DriverSettings')}>
          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          <Text style={styles.settingsButtonText}>{t('profile.settings', 'Налаштування')}</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('footer.question', 'Не знаєте як працює додаток?')}</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>{t('footer.link', 'Інструкція та знайомство з функціями')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
    fullName: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
    phone: { color: colors.secondaryText, fontSize: 16, marginBottom: 8 },
    infoCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
    },
    carInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    carInfoText: {
        color: colors.text,
        fontSize: 16,
        marginLeft: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statLabel: {
        color: colors.secondaryText,
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center',
    },
    settingsButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
    settingsButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 32 },
    footerText: { color: colors.secondaryText, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4, textDecorationLine: 'underline' },
});