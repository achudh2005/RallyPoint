import React from 'react';
import { motion } from 'framer-motion';
import { Haptics } from '../haptics.js';
import { springConfig } from '../tokens.js';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const handleSelect = (id: T) => {
    if (id !== value) {
      Haptics.selection();
      onChange(id);
    }
  };

  const heightClasses = {
    sm: 'h-8 text-[13px]',
    md: 'h-9 text-[14px]',
    lg: 'h-11 text-[16px]',
  }[size];

  return (
    <div
      role="tablist"
      className={`relative flex items-center p-1 bg-neutral-200/80 dark:bg-neutral-800/80 rounded-xl select-none backdrop-blur-md ${heightClasses} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => handleSelect(opt.id)}
            className={`relative flex-1 h-full flex items-center justify-center gap-1.5 px-3 font-semibold rounded-lg z-10 transition-colors focus:outline-none ${
              isSelected
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-pill"
                transition={springConfig}
                className="absolute inset-0 bg-white dark:bg-[#2C2C2E] rounded-lg shadow-sm"
              />
            )}
            <span className="relative z-10 truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`relative z-10 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200'
                    : 'bg-neutral-300 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
