import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { useUserStatus } from '../UserStatusContext';
import { supabase } from '../config/supabase';
import { useTheme } from './ThemeContext';

const formatLastSeen = (lastSeenDate, t) => {
    if (!lastSeenDate) return '';
    
    const now = moment();
    const lastSeen = moment(lastSeenDate);
    const diffSeconds = now.diff(lastSeen, 'seconds');

    if (diffSeconds < 60) {
        return t('status.justNow', 'Був(ла) щойно');
    }
    
    if (diffSeconds < 3600) {
        return lastSeen.fromNow(); 
    }

    return t('status.lastSeenAt', 'Був(ла) ') + lastSeen.format('HH:mm');
};

const ChatHeaderStatus = ({ recipientId, initialLastSeen, isTyping }) => {
    const { t } = useTranslation();
    const { onlineUsers } = useUserStatus();
    const { colors } = useTheme();
    
    const [lastSeen, setLastSeen] = useState(initialLastSeen);
    const [statusText, setStatusText] = useState('');
    
    const isPresenceOnline = onlineUsers.has(recipientId);

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
        const interval = setInterval(updateText, 30000);

        return () => clearInterval(interval);
    }, [isPresenceOnline, lastSeen, isTyping, t]);

    const getStatusColor = () => {
        if (isTyping) return colors.primary;
        if (isPresenceOnline) return '#4CAF50';
        return colors.secondaryText;
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