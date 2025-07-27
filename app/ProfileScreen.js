import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useAuth } from '../provider/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Logo from '../assets/icon.svg'; // Імпортуємо векторний логотип

// Reusable component for a profile detail row
const DetailRow = ({ label, value }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { signOut } = useAuth(); // We'll use this for the settings button for now
  const styles = getStyles(colors);
  const navigation = useNavigation();
  // In a real app, this data would come from your user session or a database query
  const userData = {
    fullName: "Мазничка Артур Ігорович",
    role: "пасажир",
    adsCount: 150,
    yearsInApp: 7,
    completedTrips: 44,
    phone: "+38 (0xx) xxx-xx-x",
    avatarUrl: '../assets/profile.png' // Replace with a real URL
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
            <Logo width={40} height={40} />
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          <TouchableOpacity style={styles.supportButton} onPress={() => navigation.navigate('Support')}>
            <Ionicons name="headset-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image source={require('../assets/profile.png')} style={styles.avatar} />
          <Text style={styles.fullName}>{userData.fullName}</Text>
          
          <DetailRow label={t('profile.role')} value={userData.role} />
          <DetailRow label={t('profile.adsCount')} value={userData.adsCount} />
          <DetailRow label={t('profile.yearsInApp')} value={userData.yearsInApp} />
          <DetailRow label={t('profile.completedTrips')} value={userData.completedTrips} />
          
          <Text style={styles.phone}>{t('profile.phone')}: {userData.phone}</Text>
        </View>

        {/* Settings Button */}
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
          <Text style={styles.settingsButtonText}>{t('profile.settings')}</Text>
        </TouchableOpacity>
        
        {/* Footer Link */}
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
    scrollContainer: { padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    logo: { width: 40, height: 40, resizeMode: 'contain' },

    headerTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    supportButton: { backgroundColor: colors.card, padding: 8, borderRadius: 20 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center' },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
    fullName: { color: colors.text, fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
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