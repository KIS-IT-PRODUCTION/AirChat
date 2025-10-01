import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Video } from 'expo-av'; // ✨ 1. Імпортуємо компонент Video
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

const FlightLoadingAnimation = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    return (
        <View style={styles.container}>
            {/* ✨ 2. Використовуємо компонент Video замість LottieView */}
            <Video
                source={require('../../assets/video.mp4')}
                style={styles.video}
                isLooping // Автоматично зациклює відео
                shouldPlay // Автоматично починає відтворення
                resizeMode="cover" // Масштабує відео, щоб заповнити контейнер
            />
            <Text style={styles.text}>{t('flights.loading', 'Шукаємо найкращі рейси...')}</Text>
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    // ✨ 3. Стилі для відео
    video: {
        width: 150,
        height: 150,
        borderRadius: 20, // Додамо заокруглення для краси
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.secondaryText,
        textAlign: 'center',
        marginTop: 10,
    },
});

export default FlightLoadingAnimation;