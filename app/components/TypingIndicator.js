// TypingIndicator.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import { useTheme } from '../ThemeContext';

const TypingIndicator = () => {
    const { colors } = useTheme();
    const yAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

    useEffect(() => {
        const animations = yAnims.map(anim =>
            Animated.sequence([
                Animated.timing(anim, { toValue: -8, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                Animated.delay(200),
            ])
        );

        const loopedAnimation = Animated.loop(
            Animated.stagger(150, animations)
        );
        loopedAnimation.start();

        return () => {
            loopedAnimation.stop();
        };
    }, []);

    const dotStyle = [styles.dot, { backgroundColor: colors.secondaryText }];

    return (
        <View style={styles.container}>
            {yAnims.map((anim, index) => (
                <Animated.View key={index} style={[dotStyle, { transform: [{ translateY: anim }] }]} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20, // Задаємо фіксовану висоту, щоб UI не "стрибав"
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
});

export default TypingIndicator;