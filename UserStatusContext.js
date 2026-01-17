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
        try {
            await supabase
                .from('profiles')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', session.user.id);
        } catch (error) {
            console.log("Error updating last_seen:", error);
        }
    };

    const setupPresence = async () => {
        if (!session?.user?.id) return;
        
        if (channelRef.current && channelRef.current.state === 'joined') return;
        
        if (channelRef.current) supabase.removeChannel(channelRef.current);

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
                        status: 'online'
                    });
                }
            });
    };

    const handleGoOffline = async () => {
        if (channelRef.current) {
            await channelRef.current.untrack();
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
        await updateDbLastSeen();
    };

    useEffect(() => {
        if (!session?.user) return;

        setupPresence();
        updateDbLastSeen();

        const heartbeatInterval = setInterval(() => {
            if (AppState.currentState === 'active') {
                updateDbLastSeen();
            }
        }, 60000);

        return () => {
            clearInterval(heartbeatInterval);
            handleGoOffline();
        };
    }, [session]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (session?.user) {
                if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                    console.log('App active: Going Online');
                    setupPresence();
                    updateDbLastSeen();
                } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                    console.log('App background: Going Offline');
                    handleGoOffline();
                }
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, [session]);

    return (
        <UserStatusContext.Provider value={{ onlineUsers }}>
            {children}
        </UserStatusContext.Provider>
    );
};