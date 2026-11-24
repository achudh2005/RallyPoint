import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface GroupedRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

export const GroupedRow: React.FC<GroupedRowProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  showChevron = false,
  destructive = false,
  disabled = false,
  className = '',
}) => {
  const isClickable = Boolean(onClick) && !disabled;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 transition-colors select-none ${
        isClickable
          ? 'cursor-pointer active:bg-neutral-100 dark:active:bg-neutral-800/80 focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-800/80'
          : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="shrink-0 flex items-center justify-center text-neutral-500 dark:text-neutral-400">{leading}</div>}
        <div className="min-w-0 flex-1">
          <p
            className={`text-[17px] leading-[22px] font-normal truncate ${
              destructive
                ? 'text-red-500 font-medium'
                : 'text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-[14px] leading-[18px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {trailing && <div className="text-[17px] text-neutral-500 dark:text-neutral-400">{trailing}</div>}
        {showChevron && (
          <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" strokeWidth={2} />
        )}
      </div>
    </div>
  );
};

export interface GroupedSectionProps {
  header?: string;
  footer?: string;
  children: React.ReactNode;
  className?: string;
}

export const GroupedSection: React.FC<GroupedSectionProps> = ({
  header,
  footer,
  children,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {header && (
        <h2 className="px-4 pb-1.5 text-[13px] font-normal uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          {header}
        </h2>
      )}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm border border-neutral-200/60 dark:border-neutral-800/80 divide-y divide-neutral-200/60 dark:divide-neutral-800/80">
        {children}
      </div>
      {footer && (
        <p className="px-4 pt-1.5 text-[13px] leading-[18px] text-neutral-500 dark:text-neutral-400">
          {footer}
        </p>
      )}
    </div>
  );
};

export const GroupedList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`px-4 ${className}`}>{children}</div>;
};
