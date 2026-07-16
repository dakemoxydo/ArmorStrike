// ===== HUD: оркестрация панелей, событий и ref-обновлений =====
import { useEffect, useReducer, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Game } from '../game/Game';
import type { GameEvent, HudSnapshot, MinimapDynamic } from '../game/types';
import { drawMinimap } from './hud/minimapDraw';
import HudCrosshair from './hud/HudCrosshair';
import HudRadar from './hud/HudRadar';
import HudVitals from './hud/HudVitals';
import HudWeapon from './hud/HudWeapon';
import HudScoreboard from './hud/HudScoreboard';
import HudFeed, { type FeedEntry } from './hud/HudFeed';

interface HudProps {
  game: Game | null;
  active: boolean;
}

export default function HUD({ game, active }: HudProps) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const snap = useRef<HudSnapshot>({
    mode: 'menu', paused: false, health: 100, maxHealth: 100, ammo: 0, magazine: 0,
    reloading: false, reloadProgress: 0, boost: 1, score: 0, kills: 0, wave: 0, botsAlive: 0,
    alive: false, timeSec: 0, muted: false, hullId: 'hunter', turretId: 'railgun',
    weaponName: 'РЕЛЬСОТРОН', weaponLabel: 'RAILGUN', weaponColor: '#2ee6c0', weaponAccentClass: 'text-cyan-300/80',
    showScore: false, scoreboard: [],
  });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [banner, setBanner] = useState<{ n: number; key: number } | null>(null);
  const [vignette, setVignette] = useState(0);
  const [dmgArc, setDmgArc] = useState<{ dir: number; key: number } | null>(null);
  const [hitmark, setHitmark] = useState<{ kill: boolean; key: number } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [frag, setFrag] = useState<{ victim: string; key: number } | null>(null);

  const healthRef = useRef<HTMLDivElement>(null);
  const healthNumRef = useRef<HTMLSpanElement>(null);
  const boostRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const mmBuf = useRef<MinimapDynamic[]>([]);
  const feedId = useRef(0);

  useEffect(() => {
    if (!game) return;
    const onEvent = (e: GameEvent) => {
      if (e.type === 'playerHit') {
        setVignette((v) => v + 1);
        setDmgArc({ dir: e.dir, key: performance.now() });
      } else if (e.type === 'enemyHit') {
        setHitmark({ kill: e.killed, key: performance.now() });
      } else if (e.type === 'kill') {
        const id = ++feedId.current;
        setFeed((f) => [...f.slice(-4), { id, victim: e.victim, byPlayer: e.byPlayer }]);
        setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 4200);
        if (e.byPlayer) setFrag({ victim: e.victim, key: performance.now() });
      } else if (e.type === 'wave') {
        setBanner({ n: e.n, key: performance.now() });
      } else if (e.type === 'shotFired') {
        const el = crossRef.current?.querySelector('.cross-core');
        if (el) {
          el.classList.remove('shot-pulse');
          void (el as HTMLElement).offsetWidth;
          el.classList.add('shot-pulse');
        }
      }
    };
    game.addListener(onEvent);
    return () => game.removeListener(onEvent);
  }, [game]);

  useEffect(() => {
    if (!active) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 11000);
    return () => clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!game) return;
    const onHud = (s: HudSnapshot) => {
      const c = snap.current;

      if (healthRef.current) {
        const pct = Math.max(0, (s.health / s.maxHealth) * 100);
        healthRef.current.style.width = `${pct}%`;
        healthRef.current.classList.toggle('danger', pct < 32);
      }
      if (healthNumRef.current) healthNumRef.current.textContent = `${Math.ceil(s.health)}`;
      if (boostRef.current) {
        const b = Math.max(0, Math.min(100, s.boost * 100));
        boostRef.current.style.width = `${b}%`;
        boostRef.current.classList.toggle('low', b < 15);
      }
      if (reloadRef.current) {
        const p = s.reloading ? Math.round(s.reloadProgress * 360) : 360;
        reloadRef.current.style.background =
          s.reloading
            ? `conic-gradient(#ffd24a ${p}deg, rgba(255,255,255,0.07) ${p}deg)`
            : `conic-gradient(#2ee6c0 360deg, rgba(0,0,0,0) 0deg)`;
      }
      drawMinimap(game, mapRef.current, mmBuf.current);

      if (
        c.ammo !== s.ammo || c.reloading !== s.reloading || c.isCharging !== s.isCharging ||
        c.score !== s.score || c.wave !== s.wave || c.botsAlive !== s.botsAlive || c.alive !== s.alive ||
        c.paused !== s.paused || c.muted !== s.muted || c.mode !== s.mode ||
        c.showScore !== s.showScore ||
        Math.floor(s.timeSec) !== Math.floor(c.timeSec)
      ) {
        force();
      }
      snap.current = { ...s };
    };
    game.setHudCallback(onHud);
    return () => game.setHudCallback(null);
  }, [game]);

  if (!game) return null;
  const st = snap.current;
  const time = `${String(Math.floor(st.timeSec / 60)).padStart(2, '0')}:${String(Math.floor(st.timeSec) % 60).padStart(2, '0')}`;
  const inGame = st.mode === 'playing';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden">
      {inGame && !st.paused && <HudCrosshair crossRef={crossRef} hitmark={hitmark} />}

      {vignette > 0 && <div key={vignette} className="damage-vignette" aria-hidden />}

      {inGame && !st.paused && dmgArc && (
        <div
          key={dmgArc.key}
          className="damage-arc"
          aria-hidden
          style={{ transform: `translate(-50%, -50%) rotate(${(dmgArc.dir * 180) / Math.PI + 243}deg)` }}
        >
          <svg width="190" height="190" viewBox="0 0 190 190">
            <circle
              cx="95" cy="95" r="78"
              fill="none"
              stroke="rgba(255,45,60,0.95)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="72 1000"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,45,60,0.9))' }}
            />
          </svg>
        </div>
      )}

      {inGame && (
        <>
          <HudRadar mapRef={mapRef} wave={st.wave} botsAlive={st.botsAlive} />

          <div className="anim-up absolute left-1/2 top-5 -translate-x-1/2" style={{ '--d': '0.15s' } as React.CSSProperties}>
            <div className="hud-panel score-panel px-8 py-2.5 text-center" aria-label={`Счёт ${st.score}`}>
              <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.35em] text-cyan-200/60">
                <Trophy size={11} /> СЧЁТ
              </div>
              <div className="score-num">{String(st.score).padStart(6, '0')}</div>
              <div className="mt-0.5 text-[10px] tracking-[0.3em] text-white/40">
                {time} · ФРАГИ {st.kills}
              </div>
            </div>
          </div>

          <HudFeed feed={feed} muted={st.muted} onToggleMute={() => game.toggleMute()} />
          <HudVitals healthRef={healthRef} healthNumRef={healthNumRef} boostRef={boostRef} maxHealth={st.maxHealth} />
          <HudWeapon reloadRef={reloadRef} st={st} />

          {showHint && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2" aria-hidden>
              <div className="hud-panel hint-panel flex items-center gap-5 px-5 py-2 text-[10px] tracking-[0.18em] text-white/55">
                <span><b className="text-cyan-300">WASD</b> ДВИЖЕНИЕ</span>
                <span><b className="text-cyan-300">SHIFT</b> НИТРО</span>
                <span><b className="text-cyan-300">МЫШЬ</b> ОБЗОР/ПРИЦЕЛ</span>
                <span><b className="text-cyan-300">ЛКМ</b> ОГОНЬ · ЗАХВАТ МЫШИ</span>
                <span><b className="text-cyan-300">R</b> МАГАЗИН</span>
                <span><b className="text-cyan-300">ESC</b> ПАУЗА</span>
              </div>
            </div>
          )}

          {banner && (
            <div key={banner.key} className="wave-banner" role="status" aria-live="polite">
              <div className="wave-banner-sub">ЗАФИКСИРОВАНО ПРИБЫТИЕ</div>
              <div className="wave-banner-text">ВОЛНА {banner.n}</div>
            </div>
          )}

          {frag && (
            <div key={frag.key} className="frag-popup" aria-hidden>
              <span className="frag-plus">+ ФРАГ</span>
              <span className="frag-victim">{frag.victim}</span>
            </div>
          )}

          {st.showScore && <HudScoreboard rows={st.scoreboard} />}
        </>
      )}
    </div>
  );
}
