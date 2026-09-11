import type { RefObject } from 'react';
import { Crosshair } from 'lucide-react';
import { weaponStatusKind } from '../../ui/hudPresentation';

interface HudWeaponProps {
  reloadRef: RefObject<HTMLDivElement | null>;
  /** Flame energy fill — width painted every frame via ref (no React force). */
  flameFillRef?: RefObject<HTMLDivElement | null>;
  /**
   * Панель принимает ПРИМИТИВЫ, а не объект снапшота. `HUD` передаёт
   * `snap.current` — объект, который мутируется на месте каждый кадр, поэтому
   * `memo` со ссылкой на него не перерисовывал бы панель никогда (патроны и
   * статус перезарядки замирали бы после маунта). Регресс-тест:
   * `src/__tests__/hudWeaponPanel.test.tsx`.
   */
  turretId: string;
  weaponLabel: string;
  weaponName: string;
  weaponAccentClass: string;
  isCharging?: boolean;
  reloading: boolean;
  ammo: number;
  magazine: number;
}

export default function HudWeapon({
  reloadRef,
  flameFillRef,
  turretId,
  weaponLabel,
  weaponName,
  weaponAccentClass,
  isCharging,
  reloading,
  ammo,
  magazine,
}: HudWeaponProps) {
  const status = weaponStatusKind({ isCharging, reloading, turretId, ammo, magazine });
  const emptyMag = status === 'empty';
  const flamePct = Math.max(0, Math.min(100, ammo));

  return (
    <div className="anim-up absolute bottom-6 right-6" style={{ '--d': '0.3s' } as React.CSSProperties}>
      <div
        className={`hud-panel weapon-panel flex items-center gap-4 p-4${emptyMag ? ' is-empty' : ''}`}
        aria-label={`Оружие: ${weaponName}`}
      >
        <div className="weapon-ring-col">
          <div ref={reloadRef} className="reload-ring">
            <Crosshair size={20} className={turretId === 'flamethrower' ? 'text-orange-300' : 'text-cyan-200'} aria-hidden />
          </div>
          <span
            className={`weapon-status${
              status === 'charging'
                ? ' is-charging'
                : status === 'reloading'
                  ? ' is-reloading'
                  : status === 'empty'
                    ? ' is-empty'
                    : ''
            }`}
          >
            {status === 'charging'
              ? '⚡ ЗАРЯДКА'
              : status === 'reloading'
                ? 'ПЕРЕЗАРЯДКА'
                : status === 'empty'
                  ? 'ПУСТО · R'
                  : '\u00a0'}
          </span>
        </div>
        <div>
          <div className={`hud-label mb-1.5 ${weaponAccentClass}`}>
            {`${weaponLabel} · ${weaponName}`}
          </div>
          {turretId === 'flamethrower' ? (
            <div className="w-36 h-3.5 bg-white/10 rounded-sm overflow-hidden border border-amber-500/40 relative">
              <div
                ref={flameFillRef}
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-75"
                style={{ width: `${flamePct}%` }}
              />
            </div>
          ) : (
            <div className="flex gap-1" aria-label={`Патроны ${ammo} из ${magazine}`}>
              {Array.from({ length: magazine }).map((_, i) => (
                <span
                  key={i}
                  className={`ammo-pip ${
                    i < ammo
                      ? turretId === 'cannon'
                        ? 'cannon'
                        : 'full'
                      : emptyMag
                        ? 'is-empty-mag'
                        : ''
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
