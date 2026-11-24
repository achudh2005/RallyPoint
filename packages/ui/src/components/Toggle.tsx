import React from 'react';
import { motion } from 'framer-motion';
import { Haptics } from '../haptics.js';
import { useTheme } from '../theme.js';
import { springConfig } from '../tokens.js';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel = 'Toggle switch',
  className = '',
}) => {
  const { accentStyles } = useTheme();

  const handleToggle = () => {
    if (disabled) return;
    Haptics.selection();
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        checked ? accentStyles.bgLight : 'bg-neutral-300 dark:bg-neutral-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <motion.span
        layout
        transition={springConfig}
        className={`pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-md ${
          checked ? 'ml-auto' : 'mr-auto'
        }`}
      />
    </button>
  );
};
