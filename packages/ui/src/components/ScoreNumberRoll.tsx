import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../theme.js';
import { gentleSpring } from '../tokens.js';

export interface ScoreNumberRollProps {
  score: number;
  className?: string;
  size?: 'md' | 'lg' | 'giant';
}

export const ScoreNumberRoll: React.FC<ScoreNumberRollProps> = ({
  score,
  className = '',
  size = 'giant',
}) => {
  const { reducedMotion } = useTheme();

  const sizeClasses = {
    md: 'text-4xl h-10',
    lg: 'text-6xl h-16',
    giant: 'text-8xl sm:text-9xl h-28 sm:h-36',
  }[size];

  if (reducedMotion) {
    return (
      <span className={`font-black tracking-tighter tabular-nums select-none ${sizeClasses} ${className}`}>
        {score}
      </span>
    );
  }

  return (
    <div className={`relative overflow-hidden flex items-center justify-center ${sizeClasses} ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={score}
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={gentleSpring}
          className="font-black tracking-tighter tabular-nums select-none inline-block"
        >
          {score}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
