import { useEffect, useReducer, useRef, useState } from 'react';
import type { GameApi } from '../game/GameApi';
import type { CaptureHudPoint, GameEvent, HudSnapshot, MinimapDynamic } from '../game/types';
import { drawMinimap } from '../components/hud/minimapDraw';
import type { FeedEntry } from '../components/hud/HudFeed';
import { WEAPONS } from '../core/WeaponCatalog';
import { ammoForcesHudRender, isLowHealth } from '../ui/hudPresentation';

function captureStripKey(pts: readonly CaptureHudPoint[]): string {
  if (!pts.length) return '';
  let k = '';
  for (const p of pts) {
    k += `${p.id}:${p.owner ?? 'n'}:${p.contested ? 1 : 0}:${Math.floor(p.progress * 10)},`;
  }
  return k;
}

const _defaultWeapon = WEAPONS.railgun;
const SNAP_INIT: HudSnapshot = {
  mode: 'menu', paused: false, health: 100, maxHealth: 100, ammo: 0, magazine: 0,
  reloading: false, reloadProgress: 0, boost: 1, score: 0, kills: 0, deaths: 0, botsAlive: 0,
  alive: false, timeSec: 0, muted: false, hullId: 'hunter', turretId: 'railgun',
  weaponName: _defaultWeapon.name, weaponLabel: _defaultWeapon.label,
  weaponColor: _defaultWeapon.color, weaponAccentClass: _defaultWeapon.accentClass,
  showScore: false, scoreboard: [],
  matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
  teamKillsAlpha: 0, teamKillsBravo: 0,
  teamScoreAlpha: 0, teamScoreBravo: 0,
  capturePoints: [],
};

export function useGameHud(game: GameApi | null, active: boolean) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const snap = useRef<HudSnapshot>(SNAP_INIT);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [vignette, setVignette] = useState(0);
  const [dmgArc, setDmgArc] = useState<{ dir: number; key: number } | null>(null);
  const [hitmark, setHitmark] = useState<{ kill: boolean; key: number } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [frag, setFrag] = useState<{ victim: string; key: number } | null>(null);
  const [streak, setStreak] = useState<{ label: string; count: number; key: number } | null>(null);

  const healthRef = useRef<HTMLDivElement>(null);
  const healthNumRef = useRef<HTMLSpanElement>(null);
  const boostRef = useRef<HTMLDivElement>(null);
  const reloadRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  /** Flame energy bar — continuous ammo without React force thrash. */
  const flameFillRef = useRef<HTMLDivElement>(null);
  /** Ghost HP bar — показывает недавний урон. */
  const ghostRef = useRef<HTMLDivElement>(null);
  const mmBuf = useRef<MinimapDynamic[]>([]);
  const feedId = useRef(0);
  const lastLiveKey = useRef('');

  useEffect(() => {
    if (!game) return;
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const onEvent = (e: GameEvent) => {
      if (e.type === 'playerHit') {
        setVignette((v) => v + 1);
        setDmgArc({ dir: e.dir, key: performance.now() });
      } else if (e.type === 'enemyHit') {
        setHitmark({ kill: e.killed, key: performance.now() });
      } else if (e.type === 'kill') {
        const id = ++feedId.current;
        setFeed((f) => [...f.slice(-4), { id, victim: e.victim, byPlayer: e.byPlayer }]);
        const t = setTimeout(() => { pendingTimers.delete(t); setFeed((f) => f.filter((x) => x.id !== id)); }, 4200);
        pendingTimers.add(t);
        if (e.byPlayer) setFrag({ victim: e.victim, key: performance.now() });
      } else if (e.type === 'killStreak') {
        setStreak({ label: e.label, count: e.count, key: performance.now() });
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
    return () => { game.removeListener(onEvent); pendingTimers.forEach(clearTimeout); };
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

      const pct = Math.max(0, (s.health / s.maxHealth) * 100);
      const lowHp = isLowHealth(s.health, s.maxHealth);
      if (healthRef.current) {
        healthRef.current.style.width = `${pct}%`;
        healthRef.current.classList.toggle('danger', lowHp);
      }
      // Ghost bar: обновляем с задержкой (CSS transition делает анимацию)
      if (ghostRef.current) {
        ghostRef.current.style.width = `${pct}%`;
      }
      if (healthNumRef.current) {
        healthNumRef.current.textContent = `${Math.ceil(s.health)}`;
        const numWrap = healthNumRef.current.parentElement;
        numWrap?.classList.toggle('danger', lowHp);
      }
      if (boostRef.current) {
        const b = Math.max(0, Math.min(100, s.boost * 100));
        boostRef.current.style.width = `${b}%`;
        boostRef.current.classList.toggle('low', b < 15);
      }
      if (reloadRef.current) {
        const p = s.reloading ? Math.round(s.reloadProgress * 360) : 360;
        reloadRef.current.style.background =
          s.reloading
            ? `conic-gradient(var(--warn, #ffd24a) ${p}deg, rgba(255,255,255,0.07) ${p}deg)`
            : `conic-gradient(var(--accent, #2ee6c0) 360deg, rgba(0,0,0,0) 0deg)`;
      }
      if (s.turretId === 'flamethrower' && flameFillRef.current) {
        const pct = Math.max(0, Math.min(100, s.ammo));
        flameFillRef.current.style.width = `${pct}%`;
      }
      if (game) drawMinimap(game, mapRef.current, mmBuf.current);

      // Threshold live region (M15) — announce only on discrete state crosses
      if (liveRef.current) {
        const emptyMag =
          !s.reloading &&
          !s.isCharging &&
          s.turretId !== 'flamethrower' &&
          s.magazine > 0 &&
          s.ammo <= 0;
        const key = [
          lowHp ? 'low' : 'ok',
          s.reloading ? 'reload' : '',
          emptyMag ? 'empty' : '',
        ].join('|');
        if (key !== lastLiveKey.current) {
          lastLiveKey.current = key;
          const parts: string[] = [];
          if (lowHp) parts.push(`Броня критична: ${Math.ceil(s.health)}`);
          if (s.reloading) parts.push('Перезарядка');
          if (emptyMag) parts.push('Магазин пуст');
          liveRef.current.textContent = parts.join('. ');
        }
      }

      if (
        ammoForcesHudRender(c.turretId, s.turretId, c.ammo, s.ammo) ||
        c.reloading !== s.reloading || c.isCharging !== s.isCharging ||
        c.score !== s.score || c.kills !== s.kills || c.deaths !== s.deaths ||
        c.botsAlive !== s.botsAlive || c.alive !== s.alive ||
        c.paused !== s.paused || c.muted !== s.muted || c.mode !== s.mode ||
        c.showScore !== s.showScore ||
        c.winTarget !== s.winTarget || c.teamKillsAlpha !== s.teamKillsAlpha ||
        c.teamKillsBravo !== s.teamKillsBravo || c.matchMode !== s.matchMode ||
        Math.floor(c.teamScoreAlpha) !== Math.floor(s.teamScoreAlpha) ||
        Math.floor(c.teamScoreBravo) !== Math.floor(s.teamScoreBravo) ||
        captureStripKey(c.capturePoints) !== captureStripKey(s.capturePoints) ||
        c.turretId !== s.turretId || c.magazine !== s.magazine || c.weaponName !== s.weaponName ||
        Math.floor(s.timeSec) !== Math.floor(c.timeSec)
      ) {
        force();
      }
      Object.assign(c, s);
    };
    game.setHudCallback(onHud);
    return () => game.setHudCallback(null);
  }, [game]);

  return {
    snap,
    feed, vignette, dmgArc, hitmark, showHint, frag, streak,
    setFeed, setVignette, setDmgArc, setHitmark, setShowHint, setFrag, setStreak,
    healthRef, healthNumRef, boostRef, reloadRef, crossRef, mapRef, liveRef,
    flameFillRef, ghostRef,
    mmBuf, feedId,
  };
}
