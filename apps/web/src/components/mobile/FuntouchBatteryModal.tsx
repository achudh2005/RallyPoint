import React, { useState, useEffect } from 'react';
import { BatteryCharging, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import { funtouchBattery } from '../../mobile/funtouchBattery.js';
import { nativeHaptics } from '../../mobile/haptics.js';

interface FuntouchBatteryModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const FuntouchBatteryModal: React.FC<FuntouchBatteryModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    funtouchBattery.shouldShowGuide().then((show) => {
      if (show) {
        setIsOpen(true);
      }
    });
  }, [forceOpen]);

  if (!isOpen) return null;

  const handleDismiss = async () => {
    nativeHaptics.selection();
    await funtouchBattery.dismissGuide();
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#141620] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl safe-bottom text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <BatteryCharging className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Background Activity Guide</h3>
              <p className="text-xs text-white/50">For iQOO & Vivo devices (Funtouch OS / OriginOS)</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close battery guide"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="my-5 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Funtouch OS aggressively terminates background apps. To keep live score sync, match recovery, and notifications active, allow background activity:
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                1
              </span>
              <p className="text-white/80 text-xs sm:text-sm">
                Open <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Apps</strong> &gt; <strong className="text-white">RallyPoint</strong> &gt; <strong className="text-white">Battery</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                2
              </span>
              <p className="text-white/80 text-xs sm:text-sm">
                Select <strong className="text-emerald-400">Unrestricted</strong> or enable <strong className="text-emerald-400">Allow background activity</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                3
              </span>
              <p className="text-white/80 text-xs sm:text-sm">
                In <strong className="text-white">iManager</strong> &gt; <strong className="text-white">App Manager</strong> &gt; <strong className="text-white">Auto-start</strong>, turn on <strong className="text-white">RallyPoint</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2">
          <button
            onClick={handleDismiss}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 touch-target-48"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Understood &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
