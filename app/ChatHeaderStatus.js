import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import moment from 'moment';
import { useTranslation } from 'react-i18next'; // Імпорт для локалізації
import { useUserStatus } from '../UserStatusContext';
import { supabase } from '../config/supabase';
import { useTheme } from './ThemeContext';

// Функція форматування часу тепер приймає t (функцію перекладу)
const formatLastSeen = (lastSeenDate, t) => {
    if (!lastSeenDate) return '';
    
    const now = moment();
    const lastSeen = moment(lastSeenDate);
    const diffSeconds = now.diff(lastSeen, 'seconds');

    // Якщо різниця менше 60 секунд
    if (diffSeconds < 60) {
        return t('status.justNow', 'Був(ла) щойно');
    }
    
    // Якщо менше години - використовуємо вбудований формат moment (наприклад, "5 хвилин тому")
    if (diffSeconds < 3600) {
        return lastSeen.fromNow(); 
    }

    // В інших випадках: "Був(ла) о 14:30"
    return t('status.lastSeenAt', 'Був(ла) ') + lastSeen.format('HH:mm');
};

const ChatHeaderStatus = ({ recipientId, initialLastSeen, isTyping }) => {
    const { t } = useTranslation(); // Хук перекладу
    const { onlineUsers } = useUserStatus();
    const { colors } = useTheme();
    
    const [lastSeen, setLastSeen] = useState(initialLastSeen);
    const [statusText, setStatusText] = useState('');
    
    // Перевірка онлайн через контекст (Socket)
    const isPresenceOnline = onlineUsers.has(recipientId);

    // Підписка на оновлення бази даних (резервний варіант для last_seen)
    useEffect(() => {
        if (!recipientId) return;
        
        const channel = supabase.channel(`public:profiles:id=eq.${recipientId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${recipientId}` }, 
                (payload) => {
                    if (payload.new.last_seen) {
                        setLastSeen(payload.new.last_seen);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [recipientId]);

    // Оновлення тексту статусу
    useEffect(() => {
        const updateText = () => {
            if (isTyping) {
                setStatusText(t('chat.typing', 'друкує...'));
            } else if (isPresenceOnline) {
                setStatusText(t('chat.onlineStatus', 'Онлайн'));
            } else {
                setStatusText(formatLastSeen(lastSeen, t)); 
            }
        };

        updateText();
        // Оновлюємо текст кожні 30 сек (щоб змінювався час "був 5 хв тому")
        const interval = setInterval(updateText, 30000);

        return () => clearInterval(interval);
    }, [isPresenceOnline, lastSeen, isTyping, t]);

    // Стилі тексту
    const getStatusColor = () => {
        if (isTyping) return colors.primary; // Колір для "друкує..."
        if (isPresenceOnline) return '#4CAF50'; // Зелений для Онлайн
        return colors.secondaryText; // Сірий для офлайн
    };

    return (
        <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ 
                fontSize: 12, 
                color: getStatusColor(),
                fontWeight: (isPresenceOnline || isTyping) ? '600' : 'normal'
            }}>
                {statusText}
            </Text>
        </View>
    );
};

export default ChatHeaderStatus;