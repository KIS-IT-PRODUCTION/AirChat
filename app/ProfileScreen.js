// app/ProfileScreen.js
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

const DetailRow = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={getStyles(colors).detailRow}>
      <Text style={getStyles(colors).detailLabel}>{label}</Text>
      <Text style={getStyles(colors).detailValue}>{value || '0'}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const calculateTimeInApp = (joinDate) => {
    if (!joinDate) return `0 ${t('profile.years', 'років')}`;
    const years = moment().diff(moment(joinDate), 'years');
    if (years > 0) {
        return `${years} ${years === 1 ? t('profile.year', 'рік') : t('profile.years', 'роки')}`;
    }
    const months = moment().diff(moment(joinDate), 'months');
    if (months > 0) {
        return `${months} ${months === 1 ? t('profile.month', 'місяць') : t('profile.months', 'місяців')}`;
    }
    return `< 1 ${t('profile.month', 'місяця')}`;
  };

  const fetchProfileData = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // ✨ ВИКОРИСТОВУЄМО НОВУ ФУНКЦІЮ
      const { data, error } = await supabase
        .rpc('get_passenger_profile_details', { p_user_id: session.user.id })
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  }, [session, t]);

  useFocusEffect(useCallback(() => {
    fetchProfileData();
  }, [fetchProfileData]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.fullName}>{t('profile.noData', 'Не вдалося завантажити профіль.')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <Logo width={40} height={40} />
          <Text style={styles.headerTitle}>{t('profile.myProfile', 'Мій профіль')}</Text>
          <TouchableOpacity style={styles.supportButton} onPress={() => { /* Navigate to support */ }}>
            <Ionicons name="headset-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <Image 
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/default-avatar.png')} 
            style={styles.avatar} 
          />
          <Text style={styles.fullName}>{profile.full_name || t('profile.noName', 'Безіменний користувач')}</Text>
          
          {/* ✨ ВІДОБРАЖАЄМО ДАНІ З НОВОЇ ФУНКЦІЇ */}
          <DetailRow label={t('profile.role')} value={profile.role} />
          <DetailRow label={t('profile.adsCount')} value={profile.ads_count} />
          <DetailRow label={t('profile.yearsInApp')} value={calculateTimeInApp(profile.member_since)} />
          <DetailRow label={t('profile.completedTrips')} value={profile.completed_trips} />
          
          <Text style={styles.phone}>{t('profile.phone')}: {profile.phone || t('profile.noPhone', 'Не вказано')}</Text>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          <Text style={styles.settingsButtonText}>{t('profile.settings')}</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('footer.question')}</Text>
          <TouchableOpacity>
            <Text style={styles.footerLink}>{t('footer.link')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center' },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, backgroundColor: colors.background },
    fullName: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
    detailLabel: { color: colors.secondaryText, fontSize: 16 },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    phone: { color: colors.secondaryText, fontSize: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, width: '100%', textAlign: 'center' },
    settingsButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
    settingsButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { color: colors.secondaryText, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4, textDecorationLine: 'underline' },
});
