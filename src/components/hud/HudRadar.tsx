import type { RefObject } from 'react';
import { Radio, Skull } from 'lucide-react';
import { MAP_SIZE } from './minimapDraw';

interface HudRadarProps {
  mapRef: RefObject<HTMLCanvasElement | null>;
  /** Живые противники. В TDM/CP союзники не считаются (см. HudModel.countEnemiesAlive). */
  enemiesAlive: number;
  /**
   * Ёмкость ленты угроз: сколько противников вообще может быть живо в этом
   * режиме (U29). Лента рисует ровно столько слотов, сколько вмещает матч,
   * поэтому она никогда не переносится на вторую строку. Раньше слоты
   * рендерились по факту и восьмой уезжал на угловую скобку панели.
   */
  capacity: number;
}

export default function HudRadar({ mapRef, enemiesAlive, capacity }: HudRadarProps) {
  // Слоты всегда фиксированы: пустой — не «нет данных», а «чисто», и по
  // ширине ленты сразу видно, сколько врагов в принципе может быть.
  const slots = Math.max(1, capacity);
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
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <span className="hud-label flex shrink-0 items-center gap-1.5">
          <Skull size={12} aria-hidden /> ЦЕЛИ
          <b className="threat-count">{enemiesAlive}</b>
        </span>
        {/* flex-wrap: 9 целей в TDM уже упираются в ширину панели (172px). */}
        <div className="radar-targets" aria-hidden>
          {Array.from({ length: slots }).map((_, i) => (
            <span key={i} className={`bot-pip${i < enemiesAlive ? ' is-live' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
