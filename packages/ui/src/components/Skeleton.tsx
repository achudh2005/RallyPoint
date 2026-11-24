import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
}) => {
  const variantClass = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rounded: 'rounded-2xl',
  }[variant];

  return (
    <div
      style={{ width, height }}
      className={`animate-pulse bg-neutral-200/80 dark:bg-neutral-800/80 ${variantClass} ${className}`}
    />
  );
};
