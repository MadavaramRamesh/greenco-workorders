import { useColorScheme } from 'react-native';

/**
 * GreenCo Work Orders - Design tokens based on docs/SPEC.md Section 9.
 * iOS Human Interface Guidelines style, system font, light theme default.
 */

export interface ColorTriple {
  fill: string;
  text: string;
  background: string;
}

export interface ThemeTokens {
  background: string;
  card: string;
  cardSecondary: string;
  separator: string;
  text: string;
  textSecondary: string;
  brand: string;
  brandText: string;
  segmentedTrack: string;
  segmentedSelected: string;
  error: string;
  errorBackground: string;

  // Status tokens
  open: ColorTriple;
  inProgress: ColorTriple;
  completed: ColorTriple;

  // Priority tokens
  critical: ColorTriple;
  high: ColorTriple;
  medium: ColorTriple;
  low: ColorTriple;

  // Connectivity & Sync tokens
  pendingSync: ColorTriple;
  offline: ColorTriple;
  online: ColorTriple;
}

export const lightTokens: ThemeTokens = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardSecondary: '#F8F8FA',
  separator: '#E5E5EA',
  text: '#000000',
  textSecondary: '#6C6C70',
  brand: '#0F8A5F',
  brandText: '#FFFFFF',
  segmentedTrack: '#E6E6EB',
  segmentedSelected: '#FFFFFF',
  error: '#D70015',
  errorBackground: '#FFE5E3',

  open: {
    fill: '#007AFF',
    text: '#007AFF',
    background: '#E5F0FF',
  },
  inProgress: {
    fill: '#FF9500',
    text: '#B25E00',
    background: '#FFF0D6',
  },
  completed: {
    fill: '#34C759',
    text: '#1E7A34',
    background: '#DDF6E3',
  },

  critical: {
    fill: '#FF3B30',
    text: '#D70015',
    background: '#FFE5E3',
  },
  high: {
    fill: '#FF9500',
    text: '#B25E00',
    background: '#FFF0D6',
  },
  medium: {
    fill: '#FFCC00',
    text: '#8A6100',
    background: 'transparent',
  },
  low: {
    fill: '#8E8E93',
    text: '#6C6C70',
    background: 'transparent',
  },

  pendingSync: {
    fill: 'transparent',
    text: '#5E4BD1',
    background: '#ECE9FF',
  },
  offline: {
    fill: '#FF9500',
    text: '#B25E00',
    background: '#FFF0D6',
  },
  online: {
    fill: '#34C759',
    text: '#1E7A34',
    background: '#DDF6E3',
  },
};

export const darkTokens: ThemeTokens = {
  background: '#000000',
  card: '#1C1C1E',
  cardSecondary: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  brand: '#30D158',
  brandText: '#00210E',
  segmentedTrack: '#1C1C1E',
  segmentedSelected: '#636366',
  error: '#FF6961',
  errorBackground: '#3E110F',

  open: {
    fill: '#0A84FF',
    text: '#409CFF',
    background: '#0D2A4A',
  },
  inProgress: {
    fill: '#FF9F0A',
    text: '#FFB340',
    background: '#3E2400',
  },
  completed: {
    fill: '#30D158',
    text: '#30D158',
    background: '#0C2B14',
  },

  critical: {
    fill: '#FF453A',
    text: '#FF6961',
    background: '#3E110F',
  },
  high: {
    fill: '#FF9F0A',
    text: '#FFB340',
    background: '#3E2400',
  },
  medium: {
    fill: '#FFD60A',
    text: '#FFD60A',
    background: 'transparent',
  },
  low: {
    fill: '#8E8E93',
    text: '#98989F',
    background: 'transparent',
  },

  pendingSync: {
    fill: 'transparent',
    text: '#9D8CFF',
    background: '#231B4D',
  },
  offline: {
    fill: '#FF9F0A',
    text: '#FFB340',
    background: '#3E2400',
  },
  online: {
    fill: '#30D158',
    text: '#30D158',
    background: '#0C2B14',
  },
};

export interface Theme extends ThemeTokens {
  isDark: boolean;
  scheme: 'light' | 'dark';
}

/**
 * useTheme hook: defaults to light tokens, switches to dark tokens
 * when system dark mode is active via useColorScheme().
 */
export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const tokens = isDark ? darkTokens : lightTokens;

  return {
    ...tokens,
    isDark,
    scheme: isDark ? 'dark' : 'light',
  };
}

