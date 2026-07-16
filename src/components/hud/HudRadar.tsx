import type { RefObject } from 'react';
import { Radio, Skull } from 'lucide-react';
import { MAP_SIZE } from './minimapDraw';

interface HudRadarProps {
  mapRef: RefObject<HTMLCanvasElement | null>;
  wave: number;
  botsAlive: number;
}

export default function HudRadar({ mapRef, wave, botsAlive }: HudRadarProps) {
  return (
    <div
      className="hud-panel anim-left absolute left-5 top-5 p-3"
      style={{ width: MAP_SIZE + 24, '--d': '0.05s' } as React.CSSProperties}
      role="img"
      aria-label={`Радар. Волна ${wave}. Целей: ${botsAlive}`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="hud-label flex items-center gap-1.5"><Radio size={12} /> РАДАР</span>
        <span className="hud-label text-cyan-300/90">ВОЛНА {wave}</span>
      </div>
      <div className="minimap-frame">
        <canvas ref={mapRef} width={MAP_SIZE} height={MAP_SIZE} />
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />
      </div>
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="hud-label flex items-center gap-1.5"><Skull size={12} /> ЦЕЛИ</span>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: Math.max(0, botsAlive) }).map((_, i) => (
            <span key={i} className="bot-dot" />
          ))}
          {botsAlive === 0 && <span className="hud-label text-emerald-300">ЧИСТО</span>}
        </div>
      </div>
    </div>
  );
}
