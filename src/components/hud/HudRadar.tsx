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
      className="hud-panel anim-left absolute left-5 top-5 p-3"
      style={{ width: MAP_SIZE + 24, '--d': '0.05s' } as React.CSSProperties}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="hud-label flex items-center gap-1.5"><Radio size={12} aria-hidden /> РАДАР</span>
        <span className="hud-label text-cyan-300/90">БОЙ</span>
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
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <span className="hud-label flex shrink-0 items-center gap-1.5"><Skull size={12} aria-hidden /> ЦЕЛИ</span>
        {/* flex-wrap: 9 целей в TDM уже упираются в ширину панели (172px). */}
        <div className="flex min-w-0 flex-wrap justify-end gap-1" aria-hidden>
          {Array.from({ length: Math.max(0, enemiesAlive) }).map((_, i) => (
            <span key={i} className="bot-dot" />
          ))}
          {enemiesAlive === 0 && <span className="hud-label text-emerald-300">ЧИСТО</span>}
        </div>
      </div>
    </div>
  );
}
