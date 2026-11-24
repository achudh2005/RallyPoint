import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export const ConfettiCelebration: React.FC<{ durationMs?: number }> = ({
  durationMs = 3500,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#FFFFFF'];
    const particleCount = 120;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.35 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)] || '#10B981',
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
      });
    }

    let animationId: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // Gravity
        p.vx *= 0.98; // Air friction
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, 1 - elapsed / durationMs);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.5);
        ctx.restore();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  );
};
