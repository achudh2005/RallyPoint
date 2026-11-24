/**
 * Apple Human Interface Guidelines (HIG) Design Tokens
 * RallyPoint Design System
 */

export const typography = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
  scale: {
    largeTitle: 'text-[34px] leading-[41px] font-bold tracking-tight',
    title: 'text-[28px] leading-[34px] font-bold tracking-tight',
    title2: 'text-[22px] leading-[28px] font-semibold tracking-tight',
    title3: 'text-[20px] leading-[25px] font-semibold',
    headline: 'text-[17px] leading-[22px] font-semibold',
    body: 'text-[17px] leading-[22px] font-normal',
    callout: 'text-[16px] leading-[21px] font-normal',
    subhead: 'text-[15px] leading-[20px] font-normal',
    footnote: 'text-[13px] leading-[18px] font-normal',
    caption: 'text-[12px] leading-[16px] font-normal',
    caption2: 'text-[11px] leading-[13px] font-normal',
  },
} as const;

export type AccentColor = 'green' | 'blue' | 'teal' | 'indigo' | 'amber';

export const accentColors: Record<
  AccentColor,
  {
    name: string;
    light: string;
    dark: string;
    bgLight: string;
    bgDark: string;
    textLight: string;
    textDark: string;
    ring: string;
  }
> = {
  green: {
    name: 'Wimbledon Green',
    light: '#34C759',
    dark: '#30D158',
    bgLight: 'bg-emerald-500',
    bgDark: 'bg-emerald-400',
    textLight: 'text-emerald-600',
    textDark: 'text-emerald-400',
    ring: 'focus:ring-emerald-500',
  },
  blue: {
    name: 'Court Blue',
    light: '#007AFF',
    dark: '#0A84FF',
    bgLight: 'bg-blue-600',
    bgDark: 'bg-blue-500',
    textLight: 'text-blue-600',
    textDark: 'text-blue-400',
    ring: 'focus:ring-blue-500',
  },
  teal: {
    name: 'Shuttle Teal',
    light: '#30B0C7',
    dark: '#40C8E0',
    bgLight: 'bg-teal-500',
    bgDark: 'bg-teal-400',
    textLight: 'text-teal-600',
    textDark: 'text-teal-400',
    ring: 'focus:ring-teal-500',
  },
  indigo: {
    name: 'Smash Indigo',
    light: '#5856D6',
    dark: '#5E5CE6',
    bgLight: 'bg-indigo-600',
    bgDark: 'bg-indigo-500',
    textLight: 'text-indigo-600',
    textDark: 'text-indigo-400',
    ring: 'focus:ring-indigo-500',
  },
  amber: {
    name: 'Champion Gold',
    light: '#FF9500',
    dark: '#FF9F0A',
    bgLight: 'bg-amber-500',
    bgDark: 'bg-amber-400',
    textLight: 'text-amber-600',
    textDark: 'text-amber-400',
    ring: 'focus:ring-amber-500',
  },
};

export const springConfig = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 1,
} as const;

export const gentleSpring = {
  type: 'spring',
  stiffness: 260,
  damping: 28,
} as const;

export const fastSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
} as const;
