import type { RefObject } from 'react';
import { Radio, Skull } from 'lucide-react';
import { MAP_SIZE } from './minimapDraw';

interface HudRadarProps {
  mapRef: RefObject<HTMLCanvasElement | null>;
  /** Живые противники. В TDM/CP союзники не считаются (см. HudModel.countEnemiesAlive). */
  enemiesAlive: number;
}

export default function HudRadar({ mapRef, enemiesAlive }: HudRadarProps) {
  return (
    <div
      className="hud-panel radar-panel anim-left absolute left-[var(--hud-inset)] top-[var(--hud-inset)] p-3"
      style={{ '--d': '0.05s' } as React.CSSProperties}
    >
      <span className="panel-inset" aria-hidden />
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="hud-label flex items-center gap-1.5"><Radio size={12} aria-hidden /> РАДАР</span>
        <span className="hud-label is-plain text-amber-400">БОЙ</span>
      </div>
      <div className="minimap-frame">
        {/* role="img" висит на самом канвасе, а не на панели: иначе скринридер
            съедал бы подписи «РАДАР» / «ЦЕЛИ» и список целей как единую картинку. */}
        <canvas
          ref={mapRef}
          width={MAP_SIZE}
          height={MAP_SIZE}
          role="img"
          aria-label={`Миникарта. Живых противников: ${enemiesAlive}`}
        />
        {/* Кольца дальности и оси — статичный CSS-слой над канвасом. */}
        <span className="radar-grid" aria-hidden />
        <span className="radar-north" aria-hidden>С</span>
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <span className="hud-label flex shrink-0 items-center gap-1.5"><Skull size={12} aria-hidden /> ЦЕЛИ</span>
        {/* flex-wrap: 9 целей в TDM уже упираются в ширину панели (172px). */}
        <div className="radar-targets flex min-w-0 flex-wrap justify-end gap-1" aria-hidden>
          {Array.from({ length: Math.max(0, enemiesAlive) }).map((_, i) => (
            <span key={i} className="bot-dot" />
          ))}
          {enemiesAlive === 0 && <span className="hud-label is-plain text-emerald-300">ЧИСТО</span>}
        </div>
      </div>
    </div>
  );
}
