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

// ✅ ПОЧАТОК ЗМІН: Додаємо новий компонент InfoRow для стилізації

const StatCard = memo(({ icon, value, label, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.statItem}>
            <Ionicons name={icon} size={28} color={colors.primary} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
});

// Новий компонент для рядка з інформацією
const InfoRow = memo(({ icon, label, value }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    if (!value) return null;
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={22} color={colors.secondaryText} style={styles.infoRowIcon} />
            <View>
                <Text style={styles.infoRowLabel}>{label}</Text>
                <Text style={styles.infoRowValue}>{value}</Text>
            </View>
        </View>
    );
});
// ✅ КІНЕЦЬ ЗМІН

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

  const isMyProfile = useMemo(() => session?.user?.id === driverId, [session, driverId]);

  const calculateTimeInApp = (joinDate) => {
    if (!joinDate) return `0 ${t('profile.years')}`;
    const years = moment().diff(moment(joinDate), 'years');
    if (years > 0) return `${years} ${t('profile.year', { count: years })}`;
    const months = moment().diff(moment(joinDate), 'months');
    if (months > 0) return `${months} ${t('profile.month', { count: months })}`;
    return `< 1 ${t('profile.month_one')}`;
  };

  const fetchProfileData = useCallback(async () => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('get_public_driver_profile', { p_driver_id: driverId })
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  }, [driverId, t]);

  useFocusEffect(useCallback(() => { fetchProfileData(); }, [fetchProfileData]));

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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.loadingProfile', 'Завантаження профілю...')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
        </SafeAreaView>
    );
  }

  if (!profile) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.driverProfile', 'Профіль водія')}</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={styles.content}>
                <Text style={styles.text}>{t('profile.noData', 'Не вдалося завантажити профіль.')}</Text>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
            {isMyProfile ? t('profile.yourPublicProfile', 'Ваш публічний профіль') : profile.full_name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          <Image 
            source={profile.avatar_url ? { uri: profile.avatar_url } : require('../../assets/default-avatar.png')} 
            style={styles.avatar} 
            contentFit="cover"
            transition={300}
            cachePolicy="disk"
          />
          <Text style={styles.fullName}>{profile.full_name}</Text>
          
          {!isMyProfile && (
            <View style={styles.actionsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText}>{t('profile.message', 'Написати')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                    <Ionicons name="call-outline" size={24} color={colors.primary} />
                    <Text style={styles.actionButtonText}>{t('profile.call', 'Подзвонити')}</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ✅ ПОЧАТОК ЗМІН: Новий вигляд блоку "Автомобіль" */}
        <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>{t('profile.carInfo', 'Автомобіль')}</Text>
            <InfoRow label={t('profile.carMake', 'Марка')} value={profile.car_make || t('settings.notSet')} icon="car-sport-outline" />
            <View style={styles.divider} />
            <InfoRow label={t('profile.carModel', 'Модель')} value={profile.car_model || t('settings.notSet')} icon="car-outline" />
            <View style={styles.divider} />
            <InfoRow label={t('profile.carPlate', 'Номерний знак')} value={profile.car_plate || t('settings.notSet')} icon="reader-outline" />
        </View>
        {/* ✅ КІНЕЦЬ ЗМІН */}

        <View style={styles.statsContainer}>
            <StatCard 
                icon="id-card-outline" 
                value={profile.experience_years ? `${profile.experience_years} ${t('profile.year', { count: profile.experience_years })}` : `0 ${t('profile.years')}`}
                label={t('profile.experience', 'Досвід водіння')} 
                colors={colors} 
            />
            <StatCard icon="checkmark-done-circle-outline" value={profile.completed_trips || 0} label={t('profile.completedTrips', 'Виконано поїздок')} colors={colors} />
            <StatCard icon="time-outline" value={calculateTimeInApp(profile.member_since)} label={t('profile.inApp', 'В додатку')} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0  },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: colors.secondaryText },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    profileCard: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16, backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary },
    fullName: { color: colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
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
    // ✅ ПОЧАТОК ЗМІН: Нові стилі для блоку "Автомобіль" та видалення старих
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    infoRowIcon: {
        marginRight: 16,
    },
    infoRowLabel: {
        fontSize: 12,
        color: colors.secondaryText,
        marginBottom: 2,
    },
    infoRowValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    // Старі стилі `carInfoRow` та `carInfoText` більше не потрібні
    // ✅ КІНЕЦЬ ЗМІН
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
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    actionButton: {
        alignItems: 'center',
        flex: 1,
    },
    actionButtonText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 6,
    },
});