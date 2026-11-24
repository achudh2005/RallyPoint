import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Sparkles, X, ExternalLink } from 'lucide-react';
import { UpdateCheckResult, openApkDownload } from './updateChecker';

interface UpdateModalProps {
  updateInfo: UpdateCheckResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, isOpen, onClose }) => {
  if (!isOpen || !updateInfo || !updateInfo.hasUpdate) return null;

  const handleUpdate = () => {
    openApkDownload(updateInfo.downloadUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="w-full max-w-md bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 safe-bottom overflow-hidden"
        >
          {/* Header grabber on mobile */}
          <div className="w-12 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  Update Available
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Current: {updateInfo.currentVersion} → <span className="font-semibold text-emerald-500">{updateInfo.latestVersion}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-4 border border-stone-200/60 dark:border-stone-700/60">
            <h4 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-1">
              {updateInfo.releaseName || 'What’s New in This Version'}
            </h4>
            <div className="text-xs text-stone-600 dark:text-stone-300 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
              {updateInfo.releaseNotes}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={handleUpdate}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              Download & Install Update
              <ExternalLink className="w-4 h-4 opacity-70" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-stone-600 dark:text-stone-400 font-medium text-sm hover:bg-stone-100 dark:hover:bg-stone-800/50 transition"
            >
              Remind Me Later
            </button>
          </div>

          <p className="mt-3 text-[11px] text-center text-stone-400 dark:text-stone-500">
            Tap to download the APK. After download completes, tap the file in your notification bar to install over your existing app.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
