import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const EmptyState = ({ isLoading, error, message, title, icon }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    if (isLoading) {
        return <ActivityIndicator style={{ marginTop: 50 }} size="large" color={colors.primary} />;
    }

    return (
        <View style={styles.container}>
            <Ionicons name={icon} size={50} color={colors.secondaryText} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message || error}</Text>
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginTop: 50 },
    title: { marginTop: 15, fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.text },
    message: { marginTop: 8, fontSize: 15, textAlign: 'center', color: colors.secondaryText, lineHeight: 22 },
});

export default memo(EmptyState);
