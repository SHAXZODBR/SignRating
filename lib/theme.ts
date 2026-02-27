import { MD3LightTheme } from 'react-native-paper';
import { ViewStyle } from 'react-native';

// Liquid Glass Palette (Glossy & Reflective)
export const colors = {
    // Pure reflective backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',

    // Liquid Glass surfaces (Glossy)
    glass: 'rgba(255, 255, 255, 0.45)',
    glassLiquid: 'rgba(255, 255, 255, 0.7)',
    glassBorder: 'rgba(255, 255, 255, 0.95)', // Bright reflective edge

    // Fluid Accents
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    secondary: '#8B5CF6',
    accent: '#F59E0B',

    // Feedback
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',

    // Typography
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',

    // Overlay & Borders
    overlay: 'rgba(255, 255, 255, 0.85)',
    border: 'rgba(0, 0, 0, 0.04)',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 40,
    massive: 64,
};

export const borderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20, // More compact liquid corners
    xl: 32,
    round: 999,
};

// Liquid Glass Presets (Glossy/Fluid)
export const glassStyles: Record<string, any> = {
    container: {
        backgroundColor: colors.glass,
        borderRadius: borderRadius.lg,
        borderWidth: 1.2,
        borderColor: colors.glassBorder,
        overflow: 'hidden' as const,
        // Refined Glow
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    reflection: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: '45%' as any,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderBottomLeftRadius: 100,
        borderBottomRightRadius: 100,
        transform: [{ scaleX: 1.5 }],
    },
    glow: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    blurIntensity: 60,
};

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: colors.primary,
        secondary: colors.secondary,
        background: colors.background,
        surface: colors.backgroundSecondary,
        error: colors.error,
        onSurface: colors.text,
        outline: colors.border,
    },
    fonts: {
        ...MD3LightTheme.fonts,
    },
};
