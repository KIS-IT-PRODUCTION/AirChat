import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import Logo from '../assets/icon.svg';
import moment from 'moment';
import { MotiView } from 'moti'; // Переконайтесь, що MotiView імпортовано

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

export default function ProfileScreen() {
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

  // ✅ ВИПРАВЛЕНО: Викликаємо нову SQL-функцію
  const fetchProfileData = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_full_passenger_profile', { p_user_id: session.user.id }) // Використовуємо нову функцію
        .single(); // .single() тут безпечно
        
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
         {/* ✅ ВИПРАВЛЕНО: Додано хедер навіть під час завантаження */}
        <View style={styles.header}>
            <Logo width={40} height={40} />
            <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
            <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')} disabled={true}>
              <Ionicons name="headset-outline" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
         {/* ✅ ВИПРАВЛЕНО: Додано хедер і краще повідомлення про помилку */}
        <View style={styles.header}>
            <Logo width={40} height={40} />
            <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
             <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')} disabled={true}>
              <Ionicons name="headset-outline" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
        </View>
         <View style={styles.centeredMessage}>
            <Ionicons name="alert-circle-outline" size={50} color={colors.secondaryText} />
            <Text style={styles.noDataText}>{t('profile.noProfileFound', 'Профіль не знайдено.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <Logo width={40} height={40} />
          <Text style={styles.headerTitle}>{t('profile.myProfile')}</Text>
          <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')}>
            <Ionicons name="headset-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 100 }}>
          <View style={styles.profileCard}>
            <Image 
              source={profile.avatar_url ? { uri: profile.avatar_url } : require('../assets/default-avatar.png')} 
              style={styles.avatar} 
              contentFit="cover"
              transition={300}
            />
            <Text style={styles.fullName}>{profile.full_name || t('profile.noName')}</Text>
            <Text style={styles.phone}>{profile.phone || t('profile.noPhone')}</Text>
          </View>
        </MotiView>
        
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 200 }}>
          <View style={styles.statsContainer}>
              {/* ✅ ВИПРАВЛЕНО: Використовуємо нові назви полів */}
              <StatCard icon="checkmark-done-circle-outline" value={profile.completed_trips_count || 0} label={t('profile.completedTrips')} colors={colors} />
              <StatCard icon="file-tray-full-outline" value={profile.transfers_created_count || 0} label={t('profile.adsCount')} colors={colors} />
              <StatCard icon="time-outline" value={calculateTimeInApp(profile.member_since)} label={t('profile.inApp')} colors={colors} />
          </View>
        </MotiView>
        
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 300 }}>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            <Text style={styles.settingsButtonText}>{t('profile.settings')}</Text>
          </TouchableOpacity>
        </MotiView>
        
        <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 400, delay: 400 }}>
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('footer.question')}</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>{t('footer.link')}</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

// Стилі (з додаванням centeredMessage та noDataText)
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
    fullName: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
    phone: { color: colors.secondaryText, fontSize: 16, marginBottom: 8 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 8 },
    statLabel: { color: colors.secondaryText, fontSize: 12, marginTop: 4, textAlign: 'center' },
    settingsButton: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
    settingsButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    footer: { alignItems: 'center', marginTop: 32 },
    footerText: { color: colors.secondaryText, fontSize: 14 },
    footerLink: { color: colors.primary, fontSize: 14, fontWeight: '600', marginTop: 4, textDecorationLine: 'underline' },
    centeredMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 15 },
    noDataText: { color: colors.secondaryText, fontSize: 16, textAlign: 'center', lineHeight: 24 }
});