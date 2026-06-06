import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@constants/index';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeStore {
    preference: ThemePreference;
    isLoaded: boolean;
    setPreference: (pref: ThemePreference) => Promise<void>;
    loadPreference: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
    preference: 'system',
    isLoaded: false,

    loadPreference: async () => {
        try {
            const stored = await SecureStore.getItemAsync(STORAGE_KEYS.THEME_PREFERENCE);
            const pref = (stored as ThemePreference | null) ?? 'system';
            set({ preference: pref, isLoaded: true });
        } catch {
            set({ preference: 'system', isLoaded: true });
        }
    },

    setPreference: async (pref: ThemePreference) => {
        set({ preference: pref });
        await SecureStore.setItemAsync(STORAGE_KEYS.THEME_PREFERENCE, pref);
    },
}));