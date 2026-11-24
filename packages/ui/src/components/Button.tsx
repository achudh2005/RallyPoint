import React from 'react';
import { motion } from 'framer-motion';
import { Haptics } from '../haptics.js';
import { useTheme } from '../theme.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  children,
  onClick,
  disabled = false,
  className = '',
  ...props
}) => {
  const { accentStyles, reducedMotion } = useTheme();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    Haptics.selection();
    onClick?.(e);
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-[14px] rounded-full gap-1.5',
    md: 'min-h-[44px] px-5 text-[16px] rounded-full gap-2',
    lg: 'min-h-[54px] px-6 text-[18px] rounded-2xl gap-2.5 font-bold',
  }[size];

  const variantClasses = {
    primary: `${accentStyles.bgLight} text-white font-semibold shadow-sm hover:brightness-105`,
    secondary:
      'bg-neutral-200/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 font-semibold hover:bg-neutral-300/80 dark:hover:bg-neutral-700/80',
    tertiary: `${accentStyles.textLight} dark:${accentStyles.textDark} font-semibold hover:opacity-80 bg-transparent`,
    destructive: 'bg-red-500 text-white font-semibold shadow-sm hover:bg-red-600',
    glass:
      'bg-white/70 dark:bg-neutral-800/70 text-neutral-900 dark:text-white font-semibold backdrop-blur-md border border-black/5 dark:border-white/10 shadow-sm',
  }[variant];

  return (
    <motion.button
      whileTap={reducedMotion || disabled ? undefined : { scale: 0.97 }}
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        fullWidth ? 'w-full' : ''
      } ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      } ${className}`}
      {...(props as any)}
    >
      {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
      <span className="truncate">{children}</span>
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </motion.button>
  );
};
