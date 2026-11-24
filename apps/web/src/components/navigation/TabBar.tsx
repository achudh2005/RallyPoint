import React from 'react';
import { LucideIcon, Play, Trophy, Users, User } from 'lucide-react';
import { Haptics } from '@rallypoint/ui';

export type MainTab = 'play' | 'rankings' | 'players' | 'profile';

export interface TabBarProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onChange, className = '' }) => {
  const tabs: { id: MainTab; label: string; icon: LucideIcon }[] = [
    { id: 'play', label: 'Play', icon: Play },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleTabSelect = (tab: MainTab) => {
    if (tab !== activeTab) {
      Haptics.selection();
      onChange(tab);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Main Navigation"
      className={`fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-[#121214]/85 backdrop-blur-xl border-t border-neutral-200/60 dark:border-neutral-800/80 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 select-none ${className}`}
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabSelect(tab.id)}
              className="flex-1 py-1 flex flex-col items-center justify-center relative focus:outline-none group"
            >
              <div className="relative p-1">
                <Icon
                  className={`w-6 h-6 transition-all duration-200 ${
                    isActive
                      ? 'text-emerald-500 dark:text-emerald-400 scale-105'
                      : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
              </div>
              <span
                className={`text-[11px] leading-tight font-medium transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
