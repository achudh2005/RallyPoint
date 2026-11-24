import React from 'react';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badge?: React.ReactNode;
  status?: 'online' | 'serving' | 'winner' | null;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  badge,
  status,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] rounded-lg',
    sm: 'w-8 h-8 text-[12px] rounded-xl',
    md: 'w-10 h-10 text-[14px] rounded-2xl',
    lg: 'w-14 h-14 text-[18px] rounded-[20px]',
    xl: 'w-20 h-20 text-[24px] rounded-[26px]',
  }[size];

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'RP';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    return (first + last).toUpperCase() || 'RP';
  };

  const getGradient = (n: string) => {
    let hash = 0;
    for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
    const hues = [
      'from-emerald-500 to-teal-700',
      'from-blue-500 to-indigo-700',
      'from-purple-500 to-pink-700',
      'from-amber-500 to-orange-700',
      'from-rose-500 to-red-700',
      'from-cyan-500 to-blue-700',
    ];
    return hues[Math.abs(hash) % hues.length];
  };

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses} object-cover shadow-sm border border-black/5 dark:border-white/10`}
        />
      ) : (
        <div
          className={`${sizeClasses} bg-gradient-to-br ${getGradient(
            name
          )} text-white font-bold flex items-center justify-center shadow-sm border border-black/5 dark:border-white/10 tracking-tight`}
        >
          {getInitials(name)}
        </div>
      )}

      {status === 'serving' && (
        <span
          title="Currently Serving"
          className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white dark:border-[#1C1C1E] rounded-full flex items-center justify-center text-[9px] shadow-sm"
        >
          🏸
        </span>
      )}

      {status === 'winner' && (
        <span
          title="Match Winner"
          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#1C1C1E] rounded-full flex items-center justify-center text-[9px] text-white shadow-sm"
        >
          ✓
        </span>
      )}

      {badge && (
        <div className="absolute -bottom-1 -right-1 leading-none">{badge}</div>
      )}
    </div>
  );
};
