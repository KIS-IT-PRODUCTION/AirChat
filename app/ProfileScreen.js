// app/ProfileScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';

const DetailRow = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={getStyles(colors).detailRow}>
      <Text style={getStyles(colors).detailLabel}>{label}</Text>
      <Text style={getStyles(colors).detailValue}>{value || '-'}</Text>
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

  const calculateYearsInApp = (joinDate) => {
    if (!joinDate) return 0;
    const years = new Date().getFullYear() - new Date(joinDate).getFullYear();
    return years > 0 ? years : 1;
  };

  const fetchProfileData = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          full_name, phone, role, avatar_url,
          passenger_profiles ( completed_trips, ads_count, member_since )
        `)
        .eq('id', session.user.id)
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
        <Text style={styles.fullName}>{t('profile.noData', 'Could not load profile.')}</Text>
      </SafeAreaView>
    );
  }
  
  const passengerData = profile.passenger_profiles[0] || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Logo width={40} height={40} />
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity style={styles.supportButton} onPress={() => { /* Navigate to support */ }}>
            <Ionicons name="headset-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          {/* ✨ ОНОВЛЕНА ЛОГІКА ПОКАЗУ АВАТАРА */}
          <Image 
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/default-avatar.jpg')} 
            style={styles.avatar} 
          />
          <Text style={styles.fullName}>{profile.full_name || t('profile.noName', 'Unnamed User')}</Text>
          
          <DetailRow label={t('profile.role')} value={profile.role} />
          <DetailRow label={t('profile.adsCount')} value={passengerData.ads_count} />
          <DetailRow label={t('profile.yearsInApp')} value={calculateYearsInApp(passengerData.member_since)} />
          <DetailRow label={t('profile.completedTrips')} value={passengerData.completed_trips} />
          
          <Text style={styles.phone}>{t('profile.phone')}: {profile.phone || t('profile.noPhone', 'Not specified')}</Text>
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
    container: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center' },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, backgroundColor: colors.background },
    fullName: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
    detailLabel: { color: colors.secondaryText, fontSize: 16 },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    phone: { color: colors.secondaryText, fontSize: 16, marginTop: 16 },
    settingsButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
    settingsButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { color: colors.secondaryText, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4 },
});
