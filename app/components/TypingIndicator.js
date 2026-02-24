import React, { memo, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MotiView } from 'moti';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

const Dot = memo(({ index, color }) => {
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0.4);

    useEffect(() => {
        const delay = index * 150;
        const duration = 400;

        translateY.value = withDelay(
            delay,
            withRepeat(
                withTiming(-6, { duration, easing: Easing.inOut(Easing.ease) }), 
                -1,
                true
            )
        );

        opacity.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), 
                -1, 
                true
            )
        );
    }, [index]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: color,
                    marginHorizontal: 2.5,
                },
                animatedStyle,
            ]}
        />
    );
});

const TypingIndicator = memo(() => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    return (
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.container}
        >
            <View style={styles.dotsWrapper}>
                {[0, 1, 2].map((index) => (
                    <Dot key={index} index={index} color={colors.primary} />
                ))}
            </View>
            <Text style={styles.typingText}>{t('chat.typing', 'друкує...')}</Text>
        </MotiView>
    );
});

const getStyles = (colors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dotsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
        paddingTop: 6,
    },
    typingText: {
        color: colors.primary,
        fontSize: 13,
        marginLeft: 8,
        fontStyle: 'italic',
        fontWeight: '500',
    },
});

export default TypingIndicator;