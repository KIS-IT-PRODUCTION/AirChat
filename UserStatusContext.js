import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './config/supabase';
import { useAuth } from './provider/AuthContext';

const UserStatusContext = createContext();

export const useUserStatus = () => useContext(UserStatusContext);

export const UserStatusProvider = ({ children }) => {
    const { session } = useAuth();
    const appState = useRef(AppState.currentState);
    const channelRef = useRef(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    const updateDbLastSeen = async () => {
        if (!session?.user?.id) return;
        // Оновлюємо last_seen в базі, щоб інші бачили актуальний час
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
    };

    const setupPresence = async () => {
        if (!session?.user?.id) return;
        
        // Якщо канал вже є, не створюємо новий
        if (channelRef.current) return;

        const channel = supabase.channel('global_presence', {
            config: { presence: { key: session.user.id } },
        });

        channelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const newOnlineUsers = new Set();
                for (const userId in state) {
                    if (state[userId]?.length > 0) newOnlineUsers.add(userId);
                }
                setOnlineUsers(newOnlineUsers);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: session.user.id,
                    });
                }
            });
    };

    // 🔥 Функція для МИТТЄВОГО виходу
    const handleGoOffline = async () => {
        if (channelRef.current) {
            // 1. Повідомляємо сервер, що ми йдемо (це прибере статус Online у інших)
            await channelRef.current.untrack();
            // 2. Відключаємось від каналу
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        // 3. Оновлюємо час в базі (щоб писало "був щойно")
        await updateDbLastSeen();
    };

    useEffect(() => {
        if (!session?.user) return;

        setupPresence();
        updateDbLastSeen();

        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                console.log('App active: Going Online');
                setupPresence();
                updateDbLastSeen();
            } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                console.log('App background: Going Offline IMMEDIATELY');
                // 🔥 Викликаємо при згортанні
                handleGoOffline();
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            handleGoOffline();
        };
    }, [session]);

    return (
        <UserStatusContext.Provider value={{ onlineUsers }}>
            {children}
        </UserStatusContext.Provider>
    );
};