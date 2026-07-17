import type { RefObject } from 'react';
import { Gauge, Heart, Shield } from 'lucide-react';

interface HudVitalsProps {
  healthRef: RefObject<HTMLDivElement | null>;
  healthNumRef: RefObject<HTMLSpanElement | null>;
  boostRef: RefObject<HTMLDivElement | null>;
  maxHealth: number;
}

export default function HudVitals({ healthRef, healthNumRef, boostRef, maxHealth }: HudVitalsProps) {
  return (
    <div className="anim-up absolute bottom-6 left-6 w-80 max-w-[min(20rem,calc(100vw-3rem))]" style={{ '--d': '0.25s' } as React.CSSProperties}>
      <div className="hud-panel p-4" aria-label="Броня и нитро">
        <div className="mb-2 flex items-center justify-between">
          <span className="hud-label flex items-center gap-1.5"><Shield size={12} aria-hidden /> БРОНЯ</span>
          <span className="hp-num flex items-center gap-1 font-display text-lg text-cyan-100">
            <Heart size={14} className="hp-heart text-cyan-300" aria-hidden />
            <span ref={healthNumRef}>100</span>
            <span className="text-xs text-white/55">/ {maxHealth}</span>
          </span>
        </div>
        <div className="hp-shell">
          <div ref={healthRef} className="hp-fill" style={{ width: '100%' }} />
          <div className="hp-segments" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="hud-label flex items-center gap-1.5"><Gauge size={12} aria-hidden /> НИТРО</span>
          <span className="text-[11px] tracking-[0.2em] text-white/55">SHIFT</span>
        </div>
        <div className="boost-shell">
          <div ref={boostRef} className="boost-fill" style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
