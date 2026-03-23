import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useUserStatus } from '../UserStatusContext';
import { supabase } from '../config/supabase';
import { useTheme } from './ThemeContext';
import TypingIndicator from './components/TypingIndicator.js'; 

const formatLastSeen = (lastSeenDate, t) => {
    if (!lastSeenDate) return '';
    
    const now = moment();
    const lastSeen = moment.utc(lastSeenDate).local(); 
    const diffSeconds = now.diff(lastSeen, 'seconds');

    if (Math.abs(diffSeconds) < 60) {
        return t('status.justNow', 'Був(ла) щойно');
    }
    
    if (diffSeconds > 0 && diffSeconds < 3600) {
        return lastSeen.fromNow(); 
    }

    if (lastSeen.isSame(now, 'day')) {
        return t('status.lastSeenToday', 'Був(ла) сьогодні о ') + lastSeen.format('HH:mm');
    }
    
    if (lastSeen.isSame(now.clone().subtract(1, 'days'), 'day')) {
        return t('status.lastSeenYesterday', 'Був(ла) вчора о ') + lastSeen.format('HH:mm');
    }

    return t('status.lastSeenAt', 'Був(ла) ') + lastSeen.format('DD.MM.YYYY HH:mm');
};

const ChatHeaderStatus = ({ recipientId, initialLastSeen, isTyping }) => {
    const { t } = useTranslation();
    const { onlineUsers } = useUserStatus();
    const { colors } = useTheme();
    
    const [lastSeen, setLastSeen] = useState(initialLastSeen);
    const [statusText, setStatusText] = useState('');
    
    const isPresenceOnline = onlineUsers.has(recipientId);

    // Якщо initialLastSeen зміниться зовні, оновлюємо стан
    useEffect(() => {
        if (initialLastSeen) setLastSeen(initialLastSeen);
    }, [initialLastSeen]);

    useEffect(() => {
        if (!recipientId) return;

        // ✨ НОВЕ: Самостійно завантажуємо last_seen з бази при відкритті чату
        const fetchInitialStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('last_seen')
                    .eq('id', recipientId)
                    .single();
                
                if (data && data.last_seen) {
                    setLastSeen(data.last_seen);
                }
            } catch (err) {
                console.error("Помилка завантаження статусу:", err);
            }
        };

        // Викликаємо завантаження, якщо ми не отримали дату від батьківського компонента
        if (!initialLastSeen) {
            fetchInitialStatus();
        }
        
        // Підписка на оновлення в реальному часі
        const channel = supabase.channel(`public:profiles:id=eq.${recipientId}`)
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${recipientId}` }, 
                (payload) => {
                    if (payload.new && payload.new.last_seen) {
                        setLastSeen(payload.new.last_seen);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [recipientId, initialLastSeen]);

    useEffect(() => {
        const updateText = () => {
            if (isPresenceOnline) {
                setStatusText(t('chat.onlineStatus', 'Онлайн'));
            } else {
                setStatusText(formatLastSeen(lastSeen, t)); 
            }
        };

        updateText();
        // Оновлюємо текст щохвилини, щоб "хвилин тому" було актуальним
        const interval = setInterval(updateText, 60000); 

        return () => clearInterval(interval);
    }, [isPresenceOnline, lastSeen, t]);

    const getStatusColor = () => {
        if (isPresenceOnline) return '#4CAF50';
        return colors.secondaryText;
    };

    return (
        <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 20 }}>
            {isTyping ? (
                <TypingIndicator />
            ) : (
                <Text style={{ 
                    fontSize: 12, 
                    color: getStatusColor(),
                    fontWeight: isPresenceOnline ? '600' : 'normal'
                }}>
                    {statusText}
                </Text>
            )}
        </View>
    );
};

export default ChatHeaderStatus;