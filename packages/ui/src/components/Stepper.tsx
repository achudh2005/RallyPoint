import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Haptics } from '../haptics.js';

export interface StepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (val: number) => string;
  disabled?: boolean;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  disabled = false,
  className = '',
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    Haptics.selection();
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    Haptics.selection();
    onChange(Math.min(max, value + step));
  };

  return (
    <div
      role="group"
      aria-label="Stepper"
      className={`inline-flex items-center bg-neutral-200/80 dark:bg-neutral-800/80 rounded-xl p-1 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      <button
        type="button"
        aria-label="Decrease value"
        disabled={disabled || value <= min}
        onClick={handleDecrement}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="w-4 h-4" strokeWidth={2.5} />
      </button>

      <span
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="px-3 min-w-[36px] text-center text-[15px] font-semibold text-neutral-900 dark:text-white"
      >
        {formatValue ? formatValue(value) : value}
      </span>

      <button
        type="button"
        aria-label="Increase value"
        disabled={disabled || value >= max}
        onClick={handleIncrement}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
};
