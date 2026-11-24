import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccentColor, accentColors } from './tokens.js';

export type ColorScheme = 'light' | 'dark' | 'auto';
export type TextSize = 'standard' | 'large' | 'accessibility';

interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isDark: boolean;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  accentStyles: (typeof accentColors)[AccentColor];
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  reducedMotion: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COLOR_SCHEME: 'rallypoint_theme_scheme',
  ACCENT: 'rallypoint_theme_accent',
  TEXT_SIZE: 'rallypoint_theme_text_size',
};

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultScheme?: ColorScheme;
  defaultAccent?: AccentColor;
}> = ({ children, defaultScheme = 'dark', defaultAccent = 'green' }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.COLOR_SCHEME) as ColorScheme;
        if (saved) return saved;
      } catch {
        // Fallback
      }
    }
    return defaultScheme;
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.ACCENT) as AccentColor;
        if (saved && accentColors[saved]) return saved;
      } catch {
        // Fallback
      }
    }
    return defaultAccent;
  });

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.TEXT_SIZE) as TextSize;
        if (saved) return saved;
      } catch {
        // Fallback
      }
    }
    return 'standard';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleDarkChange = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    if (darkQuery?.addEventListener) {
      darkQuery.addEventListener('change', handleDarkChange);
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    }

    return () => {
      if (darkQuery?.removeEventListener) {
        darkQuery.removeEventListener('change', handleDarkChange);
      }
      if (motionQuery?.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []);

  const isDark = colorScheme === 'dark' || (colorScheme === 'auto' && systemIsDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    if (textSize === 'large') {
      root.classList.add('text-scale-large');
      root.classList.remove('text-scale-a11y');
    } else if (textSize === 'accessibility') {
      root.classList.add('text-scale-a11y');
      root.classList.remove('text-scale-large');
    } else {
      root.classList.remove('text-scale-large', 'text-scale-a11y');
    }
  }, [isDark, textSize]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEYS.COLOR_SCHEME, scheme);
      } catch {}
    }
  };

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACCENT, newAccent);
      } catch {}
    }
  };

  const setTextSize = (size: TextSize) => {
    setTextSizeState(size);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEYS.TEXT_SIZE, size);
      } catch {}
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        setColorScheme,
        isDark,
        accent,
        setAccent,
        accentStyles: accentColors[accent],
        textSize,
        setTextSize,
        reducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

const defaultThemeState: ThemeContextType = {
  colorScheme: 'dark',
  setColorScheme: () => {},
  isDark: true,
  accent: 'green',
  setAccent: () => {},
  accentStyles: accentColors.green,
  textSize: 'standard',
  setTextSize: () => {},
  reducedMotion: false,
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context || defaultThemeState;
};
