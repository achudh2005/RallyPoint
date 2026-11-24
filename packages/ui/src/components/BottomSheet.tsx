import React, { useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Haptics } from '../haptics.js';
import { springConfig } from '../tokens.js';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
  maxHeight = 'max-h-[90vh]',
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      Haptics.selection();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Dimmed Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              Haptics.selection();
              onClose();
            }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet Modal Container */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            className={`relative z-10 w-full max-w-lg bg-[#F2F2F7] dark:bg-[#1C1C1E] rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col ${maxHeight} ${className}`}
          >
            {/* Grabber Handle */}
            <div className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-9 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>

            {/* Header with Title and Actions */}
            {(title || leftAction || rightAction) && (
              <div className="px-4 py-2.5 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 shrink-0">
                <div className="w-16 flex items-center justify-start text-[16px] text-neutral-500 dark:text-neutral-400">
                  {leftAction}
                </div>
                <h3 className="text-[17px] font-semibold text-neutral-900 dark:text-white truncate text-center flex-1">
                  {title}
                </h3>
                <div className="w-16 flex items-center justify-end text-[16px] font-semibold">
                  {rightAction}
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className="p-4 overflow-y-auto overscroll-contain flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
