import React from 'react';

export interface LargeTitleProps {
  title?: string;
  children?: React.ReactNode;
  subtitle?: string;
  trailingAction?: React.ReactNode;
  className?: string;
}

export const LargeTitle: React.FC<LargeTitleProps> = ({
  title,
  children,
  subtitle,
  trailingAction,
  className = '',
}) => {
  const displayTitle = title ?? children;
  return (
    <div className={`px-4 pt-3 pb-2 flex items-end justify-between ${className}`}>
      <div>
        {subtitle && (
          <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5">
            {subtitle}
          </p>
        )}
        <h1 className="text-[34px] leading-[41px] font-bold tracking-tight text-neutral-900 dark:text-white">
          {displayTitle}
        </h1>
      </div>
      {trailingAction && <div className="pb-1">{trailingAction}</div>}
    </div>
  );
};
