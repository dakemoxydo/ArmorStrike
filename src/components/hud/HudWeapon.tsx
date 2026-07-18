import type { RefObject } from 'react';
import { Crosshair } from 'lucide-react';
import type { HudSnapshot } from '../../game/types';
import { weaponStatusKind } from '../../ui/hudPresentation';

interface HudWeaponProps {
  reloadRef: RefObject<HTMLDivElement | null>;
  /** Flame energy fill — width painted every frame via ref (no React force). */
  flameFillRef?: RefObject<HTMLDivElement | null>;
  st: Pick<
    HudSnapshot,
    'turretId' | 'weaponLabel' | 'weaponName' | 'weaponAccentClass' | 'isCharging' | 'reloading' | 'ammo' | 'magazine'
  >;
}

export default function HudWeapon({ reloadRef, flameFillRef, st }: HudWeaponProps) {
  const status = weaponStatusKind({
    isCharging: st.isCharging,
    reloading: st.reloading,
    turretId: st.turretId,
    ammo: st.ammo,
    magazine: st.magazine,
  });
  const emptyMag = status === 'empty';
  const flamePct = Math.max(0, Math.min(100, st.ammo));

  return (
    <div className="anim-up absolute bottom-6 right-6" style={{ '--d': '0.3s' } as React.CSSProperties}>
      <div
        className={`hud-panel weapon-panel flex items-center gap-4 p-4${emptyMag ? ' is-empty' : ''}`}
        aria-label={`Оружие: ${st.weaponName}`}
      >
        <div className="weapon-ring-col">
          <div ref={reloadRef} className="reload-ring">
            <Crosshair size={20} className={st.turretId === 'flamethrower' ? 'text-orange-300' : 'text-cyan-200'} aria-hidden />
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
          <div className={`hud-label mb-1.5 ${st.weaponAccentClass}`}>
            {`${st.weaponLabel} · ${st.weaponName}`}
          </div>
          {st.turretId === 'flamethrower' ? (
            <div className="w-36 h-3.5 bg-white/10 rounded-sm overflow-hidden border border-amber-500/40 relative">
              <div
                ref={flameFillRef}
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-75"
                style={{ width: `${flamePct}%` }}
              />
            </div>
          ) : (
            <div className="flex gap-1" aria-label={`Патроны ${st.ammo} из ${st.magazine}`}>
              {Array.from({ length: st.magazine }).map((_, i) => (
                <span
                  key={i}
                  className={`ammo-pip ${
                    i < st.ammo
                      ? st.turretId === 'cannon'
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
