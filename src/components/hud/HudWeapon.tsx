import type { RefObject } from 'react';
import { Crosshair } from 'lucide-react';
import type { HudSnapshot } from '../../game/types';

interface HudWeaponProps {
  reloadRef: RefObject<HTMLDivElement | null>;
  st: Pick<
    HudSnapshot,
    'turretId' | 'weaponLabel' | 'weaponName' | 'weaponAccentClass' | 'isCharging' | 'reloading' | 'ammo' | 'magazine'
  >;
}

export default function HudWeapon({ reloadRef, st }: HudWeaponProps) {
  return (
    <div className="anim-up absolute bottom-6 right-6" style={{ '--d': '0.3s' } as React.CSSProperties}>
      <div className="hud-panel flex items-center gap-4 p-4" aria-label={`Оружие: ${st.weaponName}`}>
        <div className="relative">
          <div ref={reloadRef} className="reload-ring">
            <Crosshair size={20} className={st.turretId === 'flamethrower' ? 'text-orange-300' : 'text-cyan-200'} />
          </div>
          {st.isCharging ? (
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-[0.25em] text-cyan-300 font-display animate-pulse">
              ⚡ ЗАРЯДКА
            </span>
          ) : st.reloading ? (
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-[0.25em] text-amber-300">
              ПЕРЕЗАРЯДКА
            </span>
          ) : null}
        </div>
        <div>
          <div className={`hud-label mb-1.5 ${st.weaponAccentClass}`}>
            {`${st.weaponLabel} · ${st.weaponName}`}
          </div>
          {st.turretId === 'flamethrower' ? (
            <div className="w-36 h-3.5 bg-white/10 rounded-sm overflow-hidden border border-amber-500/40 relative">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(100, st.ammo))}%` }}
              />
            </div>
          ) : (
            <div className="flex gap-1" aria-label={`Патроны ${st.ammo} из ${st.magazine}`}>
              {Array.from({ length: st.magazine }).map((_, i) => (
                <span key={i} className={`ammo-pip ${i < st.ammo ? st.turretId === 'cannon' ? 'cannon' : 'full' : ''}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
