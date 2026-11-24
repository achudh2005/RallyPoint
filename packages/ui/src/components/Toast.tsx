import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics } from '../haptics.js';
import { springConfig } from '../tokens.js';

export interface ToastOptions {
  message: string;
  onUndo?: () => void;
  durationMs?: number;
  icon?: React.ReactNode;
}

interface ToastContextType {
  showToast: (opts: ToastOptions | string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentToast, setCurrentToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((opts: ToastOptions | string) => {
    const toastObj: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
    const duration = toastObj.durationMs ?? 5000;

    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrentToast({ ...toastObj, id: Date.now() });

    timerRef.current = setTimeout(() => {
      setCurrentToast(null);
    }, duration);
  }, []);

  const handleUndo = () => {
    Haptics.undo();
    currentToast?.onUndo?.();
    setCurrentToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {currentToast && (
          <div className="fixed bottom-20 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
            <motion.div
              key={currentToast.id}
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.95 }}
              transition={springConfig}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/90 dark:bg-neutral-800/90 text-white rounded-full shadow-xl backdrop-blur-xl border border-white/10 max-w-sm w-full"
            >
              <div className="flex items-center gap-2 min-w-0">
                {currentToast.icon && <span className="shrink-0">{currentToast.icon}</span>}
                <span className="text-[14px] font-medium truncate">{currentToast.message}</span>
              </div>
              {currentToast.onUndo && (
                <button
                  onClick={handleUndo}
                  className="px-2.5 py-1 text-[13px] font-bold text-amber-400 hover:text-amber-300 active:scale-95 transition-transform shrink-0 rounded-full focus:outline-none"
                >
                  Undo
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
};
