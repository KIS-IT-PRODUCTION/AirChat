import React, { memo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MotiView } from 'moti'; // Moti для плавної анімації
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

// Огортаємо компонент в memo для запобігання зайвим рендерам
const TypingIndicator = memo(() => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors);

    return (
        // Контейнер з анімацією появи/зникнення
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 200 }}
            style={styles.container}
        >
            {/* Рендеримо три крапки з анімацією */}
            {[...Array(3).keys()].map((index) => (
                <MotiView
                    from={{ scale: 0.7, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={index}
                    style={styles.dot}
                    // Налаштування анімації:
                    // loop: true - безкінечна анімація
                    // type: 'timing' - плавна зміна
                    // delay - затримка для кожної наступної крапки, що створює ефект "хвилі"
                    transition={{
                        type: 'timing',
                        duration: 400,
                        delay: index * 150,
                        loop: true,
                        repeatReverse: true, // Анімація буде плавно повертатись у початковий стан
                    }}
                />
            ))}
             {/* Додаємо текст "друкує...", щоб було зрозуміліше */}
            <Text style={styles.typingText}>{t('chat.typing', 'друкує...')}</Text>
        </MotiView>
    );
});

const getStyles = (colors) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        height: 20, // Фіксована висота для стабільності UI
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: colors.primary,
        marginHorizontal: 3,
    },
    typingText: {
        color: colors.primary,
        fontSize: 12,
        marginLeft: 6,
        fontStyle: 'italic',
    },
});

export default TypingIndicator;
