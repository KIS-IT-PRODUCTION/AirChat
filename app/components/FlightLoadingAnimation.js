import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
// Використовуємо вбудовані в Ехро іконки, вони вже є у вашому package.json
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

const FlightLoadingAnimation = () => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    // Створюємо змінну для анімації зміщення по осі Y
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Запускаємо нескінченний цикл левітації літака
        const startAnimation = () => {
            Animated.loop(
                Animated.sequence([
                    // Рух вгору
                    Animated.timing(translateY, {
                        toValue: -15,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true, // Використовує native driver для плавності 60fps
                    }),
                    // Рух вниз
                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        startAnimation();
    }, [translateY]);

    return (
        <View style={styles.container}>
            <View style={styles.animationWrapper}>
                {/* Анімований контейнер для літака */}
                <Animated.View style={[styles.planeContainer, { transform: [{ translateY }] }]}>
                    <FontAwesome5 
                        name="plane" 
                        size={80} 
                        color={colors.primary || '#3b82f6'} // Ваш основний колір або дефолтний синій
                    />
                </Animated.View>
            </View>
            
            <Text style={styles.text}>
                {t('flights.loading', 'Шукаємо найкращі рейси...')}
            </Text>
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
    animationWrapper: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        // Якщо хочете коло навколо літака, можна розкоментувати нижні рядки:
        // backgroundColor: colors.border + '20', // Напівпрозорий фон
        // borderRadius: 75,
    },
    planeContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.secondaryText,
        textAlign: 'center',
        marginTop: 20,
    },
});

export default FlightLoadingAnimation;