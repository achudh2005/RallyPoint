import React from 'react';
import { useTheme } from '../theme.js';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'destructive' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const { accentStyles } = useTheme();

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-[12px]';

  const variantClasses = {
    neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    accent: `${accentStyles.bgLight}/15 ${accentStyles.textLight} dark:${accentStyles.textDark}`,
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    destructive: 'bg-red-500/15 text-red-600 dark:text-red-400',
    outline: 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full select-none ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
};
