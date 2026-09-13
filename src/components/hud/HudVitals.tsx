import type { RefObject } from 'react';
import { Gauge, Shield } from 'lucide-react';

interface HudVitalsProps {
  healthRef: RefObject<HTMLDivElement | null>;
  healthNumRef: RefObject<HTMLSpanElement | null>;
  boostRef: RefObject<HTMLDivElement | null>;
  ghostRef: RefObject<HTMLDivElement | null>;
  maxHealth: number;
}

export default function HudVitals({ healthRef, healthNumRef, boostRef, ghostRef, maxHealth }: HudVitalsProps) {
  return (
    <div className="anim-up absolute bottom-[var(--hud-inset)] left-[var(--hud-inset)] w-80 max-w-[min(20rem,calc(100vw-3rem))]" style={{ '--d': '0.25s' } as React.CSSProperties}>
      <div className="hud-panel p-3.5" aria-label="Броня и нитро">
        <span className="panel-inset" aria-hidden />
        <div className="vitals-head">
          <span className="hud-label flex items-center gap-1.5"><Shield size={12} aria-hidden /> БРОНЯ</span>
          {/* Один символ на характеристику: сердце у числа дублировало щит
              в подписи и означало то же самое (U5). */}
          <span className="hp-num">
            <span ref={healthNumRef}>100</span>
            <span className="hp-max">/ {maxHealth}</span>
          </span>
        </div>
        <div className="hp-shell">
          {/* Ghost bar — показывает недавний урон (белая полоса) */}
          <div ref={ghostRef} className="hp-ghost" style={{ width: '100%' }} />
          <div ref={healthRef} className="hp-fill" style={{ width: '100%' }}>
            <i className="hp-edge" aria-hidden />
          </div>
          <div className="hp-segments" />
          {/* Риски четвертей: 25 / 50 / 75 % */}
          <div className="hp-ticks" aria-hidden><i /><i /><i /><i /></div>
        </div>
        <div className="vitals-foot">
          <span className="hud-label flex items-center gap-1.5"><Gauge size={12} aria-hidden /> НИТРО</span>
          <span className="vitals-key">SHIFT</span>
        </div>
        <div className="boost-shell">
          <div ref={boostRef} className="boost-fill" style={{ width: '100%' }} />
          <div className="boost-segments" aria-hidden />
        </div>
      </div>
    </div>
  );
}
