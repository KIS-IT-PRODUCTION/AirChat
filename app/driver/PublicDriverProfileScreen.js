// app/PublicDriverProfileScreen.js
import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// TODO: Цей екран потрібно буде наповнити даними,
// завантажуючи профіль водія за `driverId` з route.params.
export default function PublicDriverProfileScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { driverId, driverName } = route.params;
  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-circle" size={40} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{driverName || 'Профіль водія'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Тут буде публічний профіль водія</Text>
        <Text style={styles.text}>ID: {driverId}</Text>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 18, color: colors.secondaryText },
});
