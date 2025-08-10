// app/DriverProfileScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';

// Допоміжний компонент для зіркового рейтингу
const StarRating = ({ rating }) => {
  let stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(<Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={18} color="#FFC107" />);
  }
  return <View style={{ flexDirection: 'row' }}>{stars}</View>;
};

// Допоміжний компонент для рядка з даними
const DetailRow = ({ label, value, children }) => {
  const { colors } = useTheme();
  return (
    <View style={getStyles(colors).detailRow}>
      <Text style={getStyles(colors).detailLabel}>{label}:</Text>
      {children || <Text style={getStyles(colors).detailValue}>{value}</Text>}
    </View>
  );
};

export default function DriverProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigation = useNavigation();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const calculateExperience = (joinDate) => {
    if (!joinDate) return '0 років';
    const years = new Date().getFullYear() - new Date(joinDate).getFullYear();
    return `${years > 0 ? years : 1} ${years === 1 ? 'рік' : 'років'}`;
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
        <TouchableOpacity style={styles.supportButton} onPress={() => { /* Navigate to support */ }}>
          <Ionicons name="headset-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <Image 
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/default-avatar.jpg')} 
            style={styles.avatar} 
          />
          <Text style={styles.fullName}>{profile.full_name || t('profile.noName', 'Безіменний водій')}</Text>
          
          <View style={styles.detailsContainer}>
            <DetailRow label={t('profile.rating', 'Рейтинг')}>
              <View style={styles.ratingContainer}>
                <StarRating rating={profile.rating} />
                <Text style={styles.detailValue}>({profile.rating}/5)</Text>
              </View>
            </DetailRow>
            <DetailRow label={t('profile.completedTrips', 'Завершених рейсів')} value={profile.completed_trips} />
            <DetailRow label={t('profile.experience', 'Досвід')} value={calculateExperience(profile.member_since)} />
            <DetailRow label={t('profile.totalMileage', 'Загальний пробіг')} value={`${profile.total_mileage_km.toLocaleString('uk-UA')} км`} />
          </View>
          
          <Text style={styles.phone}>{t('profile.phone', 'Тел')}: {profile.phone || t('profile.noPhone', 'Не вказано')}</Text>
        </View>

        <TouchableOpacity style={styles.settingsButton}  onPress={() => navigation.navigate('DriverSettings')}>
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
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center' },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, backgroundColor: colors.background },
    fullName: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
    detailsContainer: { width: '100%', marginBottom: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 12 },
    detailLabel: { color: colors.secondaryText, fontSize: 16 },
    detailValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    phone: { color: colors.secondaryText, fontSize: 16, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, width: '100%', textAlign: 'center' },
    settingsButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
    settingsButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 24 },
    footerText: { color: colors.secondaryText, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4, textDecorationLine: 'underline' },
});
