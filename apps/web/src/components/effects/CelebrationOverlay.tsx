import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, Button, Haptics } from '@rallypoint/ui';
import { Crown, Trophy, RotateCcw } from 'lucide-react';
import { registerBackHandler } from '../../mobile/backButton.js';
import type { CelebrationIntensity } from '../../store/alertsSettingsStore.js';

export type CelebrationBeat =
  | 'impact'
  | 'slam'
  | 'particles'
  | 'title'
  | 'spotlight'
  | 'settle';

export interface CelebrationConfig {
  id: string;
  kind: 'SHUTOUT_GAME' | 'SHUTOUT_MATCH' | 'MATCH_WIN' | 'SEASON_CHAMPION';
  title: string; // e.g., "SHUTOUT"
  scoreText: string; // e.g., "7–0"
  subtitle: string; // e.g., "Anu & Vikram win without conceding a point"
  winners: { id: string; name: string; avatarUrl?: string }[];
  losers?: { id: string; name: string; avatarUrl?: string }[];
  isMatchWin?: boolean;
}

export interface CelebrationOverlayProps {
  config: CelebrationConfig | null;
  intensity: CelebrationIntensity;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onComplete: () => void;
  onUndo?: () => void;
  /** Deterministic test hook: override elapsed ms (0..5000) to inspect any beat. */
  testClockMs?: number;
  /** Optional callback for frame-time telemetry in tests. */
  onFrameSample?: (frameDurationMs: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  alpha: number;
  kind: 'feather' | 'spark';
  color: string;
}

function playCelebrationAudio(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Soft impact thump (0.15s)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(140, now);
    osc1.frequency.exponentialRampToValueAtTime(42, now + 0.18);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // 2. Bright celebratory chime chord (0.35s)
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + 0.25 + idx * 0.06;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.58);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Web Audio unavailable or blocked
  }
}

export function getBeatForElapsed(ms: number): CelebrationBeat {
  if (ms < 250) return 'impact';
  if (ms < 800) return 'slam';
  if (ms < 1400) return 'particles';
  if (ms < 1800) return 'title';
  if (ms < 2400) return 'spotlight';
  return 'settle';
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  config,
  intensity,
  soundEnabled,
  hapticsEnabled,
  onComplete,
  onUndo,
  testClockMs,
  onFrameSample,
}) => {
  const prefersReducedMotion = useMemo(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch {
      return false;
    }
  }, []);

  const effectiveIntensity: CelebrationIntensity =
    intensity === 'off' ? 'off' : prefersReducedMotion ? 'reduced' : intensity;

  const [elapsedMs, setElapsedMs] = useState<number>(testClockMs ?? 0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedIdRef = useRef<string | null>(null);

  const currentMs = testClockMs !== undefined ? testClockMs : elapsedMs;
  const beat = getBeatForElapsed(currentMs);

  // Skip immediately if intensity is 'off'
  useEffect(() => {
    if (config && effectiveIntensity === 'off') {
      onComplete();
    }
  }, [config, effectiveIntensity, onComplete]);

  // Back gesture skips cleanly
  useEffect(() => {
    if (!config || effectiveIntensity === 'off') return;
    return registerBackHandler(() => {
      onComplete();
      return true;
    });
  }, [config, effectiveIntensity, onComplete]);

  // Trigger audio + layered haptics once per celebration config id
  useEffect(() => {
    if (!config || effectiveIntensity === 'off') return;
    if (startedIdRef.current === config.id) return;
    startedIdRef.current = config.id;

    if (soundEnabled && testClockMs === undefined) {
      playCelebrationAudio();
    }

    if (hapticsEnabled && testClockMs === undefined) {
      Haptics.selection();
      const t1 = setTimeout(() => Haptics.pointScored(), 180);
      const t2 = setTimeout(() => Haptics.selection(), 650);
      const t3 = setTimeout(() => Haptics.pointScored(), 1100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    return undefined;
  }, [config, effectiveIntensity, soundEnabled, hapticsEnabled, testClockMs]);

  // Main timeline & auto-continue at 5000ms (unless testClockMs is driving)
  useEffect(() => {
    if (!config || effectiveIntensity === 'off' || testClockMs !== undefined) return;

    let startTs = performance.now();
    let pausedAt: number | null = null;
    let lastFrameTs = startTs;
    let frameId = 0;

    const handleVisibility = () => {
      if (document.hidden) {
        pausedAt = performance.now();
      } else if (pausedAt !== null) {
        startTs += performance.now() - pausedAt;
        pausedAt = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const tick = (now: number) => {
      if (!document.hidden) {
        const dt = now - lastFrameTs;
        lastFrameTs = now;
        onFrameSample?.(dt);

        const nextElapsed = now - startTs;
        setElapsedMs(nextElapsed);

        if (nextElapsed >= 5000) {
          onComplete();
          return;
        }
      }
      frameId = requestAnimationFrame(tick);
      rafRef.current = frameId;
    };

    frameId = requestAnimationFrame(tick);
    rafRef.current = frameId;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(frameId);
      rafRef.current = null;
      particlesRef.current = [];
    };
  }, [config, effectiveIntensity, testClockMs, onComplete, onFrameSample]);

  // Lazy 2D Canvas particle layer (only in 'full' mode)
  useEffect(() => {
    if (!config || effectiveIntensity !== 'full') {
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth || 393;
    const height = window.innerHeight || 873;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const count = config.isMatchWin ? 120 : 96;
    const colors = ['#F59E0B', '#FDE047', '#10B981', '#FFFFFF', '#38BDF8'];
    particlesRef.current = Array.from({ length: count }, (_, idx) => {
      const angle = (Math.PI * 2 * idx) / count + (Math.random() - 0.5) * 0.3;
      const speed = 2.5 + Math.random() * 6.5;
      return {
        x: width / 2,
        y: height * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 5 + Math.random() * 7,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        alpha: 1,
        kind: idx % 3 === 0 ? 'feather' : 'spark',
        color: colors[idx % colors.length]!,
      };
    });

    if (testClockMs !== undefined) return;

    let animId = 0;
    let lastTs = performance.now();
    let trimmedForPerf = false;

    const draw = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;

      // Adaptive particle scaling if frame time exceeds 20ms
      if (!trimmedForPerf && dt > 20 && particlesRef.current.length > 40) {
        particlesRef.current = particlesRef.current.slice(0, 40);
        trimmedForPerf = true;
      }

      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14; // gravity
        p.vx *= 0.99;
        p.angle += p.spin;
        p.alpha = Math.max(0, p.alpha - 0.008);

        if (p.alpha <= 0.01) continue;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;

        if (p.kind === 'feather') {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.9, p.size * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      particlesRef.current = [];
      ctx.clearRect(0, 0, width, height);
    };
  }, [config, effectiveIntensity, testClockMs]);

  if (!config || effectiveIntensity === 'off') return null;

  // Reduced motion / calm mode
  if (effectiveIntensity === 'reduced') {
    return (
      <div
        role="dialog"
        aria-label="Shutout Celebration"
        data-testid="celebration-overlay"
        data-beat={beat}
        onClick={onComplete}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-6 text-white select-none"
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-neutral-900/95 border border-amber-400/40 p-6 text-center space-y-4 shadow-2xl"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Crown className="w-3.5 h-3.5" />
            <span>{config.title} {config.scoreText}</span>
          </div>
          <div className="text-5xl font-black tracking-tight text-amber-300 font-mono">
            {config.scoreText}
          </div>
          <p className="text-sm text-neutral-300">{config.subtitle}</p>
          <div className="flex gap-2 pt-2">
            {onUndo && (
              <Button
                variant="secondary"
                fullWidth
                data-testid="celebration-undo-btn"
                onClick={onUndo}
                leadingIcon={<RotateCcw className="w-4 h-4" />}
              >
                Undo
              </Button>
            )}
            <Button variant="primary" fullWidth onClick={onComplete}>
              Continue
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const letters = config.title.split('');
  const showFlash = currentMs < 220;
  const showSlam = currentMs >= 120;
  const showTitle = currentMs >= 750;
  const showSpotlight = currentMs >= 1000;
  const showContinue = currentMs >= 2200;

  return (
    <motion.div
      role="dialog"
      aria-label="Shutout Celebration"
      data-testid="celebration-overlay"
      data-beat={beat}
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: currentMs < 250 ? [0, -3, 3, -2, 0] : 0,
      }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/80 backdrop-blur-md text-white overflow-hidden select-none"
      style={{
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Single white-gold flash (0.00 - 0.22s, <= 1 flash total, photosensitive safe) */}
      {showFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-amber-200/25 transition-opacity duration-200"
        />
      )}

      {/* Lazy 2D Canvas Particle Layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      />

      {/* Top Spacer / Mode Pill */}
      <div className="relative z-10 pt-4">
        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest text-amber-300">
          {config.isMatchWin ? 'Shutout Match Victory' : 'Shutout Game'}
        </span>
      </div>

      {/* Center Broadcast Choreography */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        {/* Rotating Sunburst Rays */}
        {currentMs >= 450 && (
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
            className="pointer-events-none absolute w-72 h-72 rounded-full opacity-25"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg 20deg, rgba(251,191,36,0.5) 20deg 40deg, transparent 40deg 60deg, rgba(251,191,36,0.4) 60deg 80deg, transparent 80deg 120deg, rgba(251,191,36,0.5) 120deg 140deg, transparent 140deg 180deg)',
            }}
          />
        )}

        {/* Shockwave Ring */}
        {showSlam && (
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute w-40 h-40 rounded-full border-2 border-amber-300/70"
          />
        )}

        {/* Giant 7-0 Slam */}
        {showSlam && (
          <motion.div
            initial={{ scale: 2.6, opacity: 0 }}
            animate={{
              scale: beat === 'settle' ? 0.88 : 1.0,
              opacity: 1,
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="text-7xl sm:text-8xl font-black tracking-tighter font-mono bg-gradient-to-b from-white via-amber-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(245,158,11,0.55)]"
          >
            {config.scoreText}
          </motion.div>
        )}

        {/* Letter-by-letter SHUTOUT Title */}
        {showTitle && (
          <div className="mt-3 flex items-center justify-center gap-1 overflow-hidden">
            {letters.map((ch, idx) => (
              <motion.span
                key={`${ch}-${idx}`}
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 320, damping: 20 }}
                className="text-2xl sm:text-3xl font-black tracking-[0.22em] text-amber-300"
              >
                {ch}
              </motion.span>
            ))}
          </div>
        )}

        {showTitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-2 text-sm sm:text-base text-white/85 font-medium max-w-xs truncate"
          >
            {config.subtitle}
          </motion.p>
        )}

        {/* Winners Spotlight */}
        {showSpotlight && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <div className="text-amber-400">
              {config.isMatchWin ? (
                <Trophy className="w-8 h-8 drop-shadow" />
              ) : (
                <Crown className="w-7 h-7 drop-shadow" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              {config.winners.map((w) => (
                <div key={w.id} className="flex flex-col items-center gap-1">
                  <div className="p-1 rounded-2xl ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                    <Avatar name={w.name} src={w.avatarUrl} size="lg" status="winner" />
                  </div>
                  <span className="text-xs font-bold text-white max-w-[96px] truncate">
                    {w.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls: Undo always reachable + Continue fades in */}
      <div
        className="relative z-10 w-full max-w-sm px-6 pb-4 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {onUndo && (
          <Button
            variant="secondary"
            fullWidth
            data-testid="celebration-undo-btn"
            onClick={onUndo}
            leadingIcon={<RotateCcw className="w-4 h-4" />}
          >
            Undo
          </Button>
        )}
        <Button
          variant="primary"
          fullWidth
          onClick={onComplete}
          className={showContinue ? 'opacity-100 transition-opacity' : 'opacity-85'}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
};
