import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from '@/lib/i18n';
import * as Localization from 'expo-localization';

interface SettingsState {
    language: Language;
    setLanguage: (lang: Language) => void;
    notifications: any[];
    addNotification: (notification: any) => void;
    clearNotifications: () => void;
}

const getSystemLanguage = (): Language => {
    const locale = Localization.getLocales()[0].languageCode;
    if (locale === 'uz') return 'uz';
    if (locale === 'ru') return 'ru';
    return 'en';
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            language: getSystemLanguage(),
            setLanguage: (language: Language) => set({ language }),
            notifications: [],
            addNotification: (notification: any) => set((state) => ({
                notifications: [notification, ...state.notifications].slice(0, 20)
            })),
            clearNotifications: () => set({ notifications: [] }),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
