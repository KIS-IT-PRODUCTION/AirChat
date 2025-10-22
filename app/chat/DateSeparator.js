// DateSeparator.js
import React, { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../ThemeContext'; // Переконайтеся, що шлях правильний

const DateSeparator = memo(({ date, styles }) => {
    const { t } = useTranslation();
    
    // 💡 ОПТИМІЗАЦІЯ: Мемоїзація форматування дати
    const formattedDate = useMemo(() => moment(date).calendar(null, { 
        sameDay: `[${t('dates.today', 'Сьогодні')}]`, 
        lastDay: `[${t('dates.yesterday', 'Вчора')}]`, 
        lastWeek: 'dddd', 
        sameElse: 'D MMMM YYYY' 
    }), [date, t]);
    
    return (
        <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formattedDate}</Text>
        </View>
    );
});

export default DateSeparator;