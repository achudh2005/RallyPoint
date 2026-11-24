import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`px-6 py-12 flex flex-col items-center justify-center text-center max-w-sm mx-auto ${className}`}
    >
      {icon && (
        <div className="w-16 h-16 rounded-3xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-3xl mb-4 text-neutral-400 dark:text-neutral-500 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-[20px] font-semibold text-neutral-900 dark:text-white mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-[15px] leading-[20px] text-neutral-500 dark:text-neutral-400 mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
