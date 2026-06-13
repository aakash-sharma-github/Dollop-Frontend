/**
 * useNetworkStatus — tracks real device connectivity via NetInfo and calls
 * `onChange` only when the connected/disconnected state actually transitions
 * (not on every NetInfo event, which can fire repeatedly while offline).
 *
 * Also updates authStore.isOffline so the rest of the app (which already
 * reads that flag) reflects real connectivity, not just "last API call failed".
 */
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@store/authStore';
import { logger } from '@utils/logger';

export function useNetworkStatus(onChange: (isConnected: boolean) => void): void {
    const previousState = useRef<boolean | null>(null);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            // isConnected can be null on first event — treat null as "unknown", skip
            if (state.isConnected === null) return;

            const isConnected = state.isConnected && state.isInternetReachable !== false;

            if (previousState.current === null) {
                // First event — set baseline without firing a toast
                previousState.current = isConnected;
                useAuthStore.setState({ isOffline: !isConnected });
                return;
            }

            if (previousState.current !== isConnected) {
                logger.info('Network', 'connectivity changed', { isConnected });
                previousState.current = isConnected;
                useAuthStore.setState({ isOffline: !isConnected });
                onChange(isConnected);
            }
        });

        return unsubscribe;
    }, [onChange]);
}