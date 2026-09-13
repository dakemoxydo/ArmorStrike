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
   * `src/__tests__/hudLiveUpdates.test.tsx`.
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
  const isFlame = turretId === 'flamethrower';
  const flamePct = Math.max(0, Math.min(100, ammo));

  return (
    <div className="anim-up absolute bottom-[var(--hud-inset)] right-[var(--hud-inset)]" style={{ '--d': '0.3s' } as React.CSSProperties}>
      <div
        className={`hud-panel weapon-panel flex items-center gap-4 p-4${emptyMag ? ' is-empty' : ''}`}
        aria-label={`Оружие: ${weaponName}`}
      >
        <span className="panel-inset" aria-hidden />
        <div className="weapon-ring-col">
          <div ref={reloadRef} className="reload-ring">
            <Crosshair size={20} className={isFlame ? 'text-orange-300' : 'text-cyan-200'} aria-hidden />
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
          <div className={`weapon-title ${weaponAccentClass}`}>
            <span>{weaponLabel}</span>
            <span className="weapon-sep" aria-hidden>·</span>
            <span className="weapon-name">{weaponName}</span>
          </div>
          {isFlame ? (
            <div className="flame-shell">
              <div
                ref={flameFillRef}
                className="flame-fill"
                style={{ width: `${flamePct}%` }}
              />
              <div className="boost-segments" aria-hidden />
            </div>
          ) : (
            <div className="ammo-rack" aria-label={`Патроны ${ammo} из ${magazine}`}>
              <div className="ammo-strip" aria-hidden>
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
              <span className="ammo-count">
                {ammo}
                <i> / {magazine}</i>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
