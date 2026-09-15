import { useEffect, useReducer, useRef, useState } from 'react';
import type { GameApi } from '../game/GameApi';
import type { GameEvent, HudSnapshot, MinimapDynamic } from '../game/types';
import { drawMinimap } from '../components/hud/minimapDraw';
import type { FeedEntry } from '../components/hud/HudFeed';
import { WEAPONS } from '../core/WeaponCatalog';
import { isLowHealth, liveRegionKey, liveRegionText } from '../ui/hudPresentation';
import { hudNeedsRender } from '../ui/hudRenderGate';

const _defaultWeapon = WEAPONS.railgun;

/**
 * Handle of `setTimeout` in whichever program compiles this file: the browser
 * program (`tsconfig.json`, DOM lib) sees `number`, while the test program
 * (`tsconfig.node.json`) pulls `@types/node` and sees `NodeJS.Timeout`. Typing
 * the handle as `number` breaks the moment a DOM test imports this hook.
 */
type TimerHandle = ReturnType<typeof setTimeout>;

/** Фабрика, а не константа: снапшот мутируется через Object.assign каждый кадр. */
function createSnapInit(): HudSnapshot {
  return {
    mode: 'menu', paused: false, health: 100, maxHealth: 100, ammo: 0, magazine: 0,
    reloading: false, reloadProgress: 0, isCharging: false, boost: 1, score: 0, kills: 0, deaths: 0,
    beamMode: 'none',
    enemiesAlive: 0, alive: false, respawnInSec: 0, timeSec: 0, muted: false, turretId: 'railgun',
    weaponName: _defaultWeapon.name, weaponLabel: _defaultWeapon.kind,
    weaponAccentClass: _defaultWeapon.accentClass,
    showScore: false, scoreboard: [],
    matchMode: 'deathmatch', winTarget: 30, timeLimitSec: 720,
    teamKillsAlpha: 0, teamKillsBravo: 0,
    teamScoreAlpha: 0, teamScoreBravo: 0,
    capturePoints: [],
    crossX: 50, crossY: 50,
  };
}

/**
 * Длительности боевых тостов. Совпадают с CSS-анимациями (см. hud.css) и нужны
 * потому, что состояние тоста должно быть временным: под `prefers-reduced-motion`
 * анимация отключена, и без таймера виньетка/дуга/хитмаркер/«+ ФРАГ» остались бы
 * на экране навсегда (элементы не размонтируются сами).
 */
const TOAST_MS = {
  vignette: 700,
  dmgArc: 1000,
  hitmark: 400,
  frag: 1300,
  streak: 1500,
} as const;

export function useGameHud(game: GameApi | null, active: boolean) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const snap = useRef<HudSnapshot>(createSnapInit());
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
  /** Захваченная цель для оружия с lock-on (Гаусс) — приклеенный прицел с масштабированием по дистанции. */
  const lockTargetRef = useRef<HTMLDivElement>(null);
  /** Предупреждение о входящем снайперском захвате цели. */
  const incomingLockRef = useRef<HTMLDivElement>(null);
  const mmBuf = useRef<MinimapDynamic[]>([]);
  const feedId = useRef(0);
  const lastLiveKey = useRef('');

  useEffect(() => {
    if (!game) return;
    const pendingTimers = new Set<TimerHandle>();
    /** Per-channel timers: a new hit restarts its toast instead of being cut short. */
    const clearTimers = new Map<string, TimerHandle>();
    const later = (channel: string, ms: number, fn: () => void) => {
      const prev = clearTimers.get(channel);
      if (prev !== undefined) {
        clearTimeout(prev);
        pendingTimers.delete(prev);
      }
      const t = setTimeout(() => {
        pendingTimers.delete(t);
        clearTimers.delete(channel);
        fn();
      }, ms);
      clearTimers.set(channel, t);
      pendingTimers.add(t);
    };
    const onEvent = (e: GameEvent) => {
      if (e.type === 'playerHit') {
        setVignette((v) => v + 1);
        setDmgArc({ dir: e.dir, key: performance.now() });
        later('dmgArc', TOAST_MS.dmgArc, () => setDmgArc(null));
        later('vignette', TOAST_MS.vignette, () => setVignette(0));
      } else if (e.type === 'enemyHit') {
        setHitmark({ kill: e.killed, key: performance.now() });
        later('hitmark', TOAST_MS.hitmark, () => setHitmark(null));
      } else if (e.type === 'kill') {
        const id = ++feedId.current;
        setFeed((f) => [...f.slice(-4), { id, victim: e.victim, byPlayer: e.byPlayer }]);
        later(`feed:${id}`, 4200, () => setFeed((f) => f.filter((x) => x.id !== id)));
        if (e.byPlayer) {
          setFrag({ victim: e.victim, key: performance.now() });
          later('frag', TOAST_MS.frag, () => setFrag(null));
        }
      } else if (e.type === 'killStreak') {
        setStreak({ label: e.label, count: e.count, key: performance.now() });
        later('streak', TOAST_MS.streak, () => setStreak(null));
      } else if (e.type === 'shotFired') {
        // Pulse restarts only once the previous one finished: the class is
        // dropped on animationend in HudCrosshair. No forced reflow here —
        // reading offsetWidth to restart a CSS animation flushed layout on
        // every single shot.
        const el = crossRef.current?.querySelector<HTMLElement>('.cross-core');
        if (el && !el.classList.contains('shot-pulse')) {
          el.classList.add('shot-pulse');
        }
      }
    };
    game.addListener(onEvent);
    return () => {
      game.removeListener(onEvent);
      pendingTimers.forEach(clearTimeout);
      clearTimers.clear();
    };
  }, [game]);

  useEffect(() => {
    if (!active) return;
    setShowHint(true);
    // Подсказка уходит по первому же вводу, а не только по таймеру: раньше она
    // висела 11 секунд поверх боя, пока игрок уже играл (U6). Таймер остаётся
    // страховкой для тех, кто смотрит, но не трогает управление.
    const hide = () => setShowHint(false);
    const t = setTimeout(hide, 11000);
    window.addEventListener('keydown', hide);
    window.addEventListener('pointerdown', hide);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', hide);
      window.removeEventListener('pointerdown', hide);
    };
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
      if ((s.turretId === 'flamethrower' || s.turretId === 'isida') && flameFillRef.current) {
        // Оба — непрерывная «оболочка» энергии: ширина пишется в ref, без React-force.
        const pct = Math.max(0, Math.min(100, s.ammo));
        flameFillRef.current.style.width = `${pct}%`;
      }
      // Прицел едет на точку реальной остановки выстрела (линия дула),
      // а не висит в центре экрана над танком. Непрерывный ref-paint.
      if (crossRef.current) {
        if (Number.isFinite(s.crossX) && Number.isFinite(s.crossY)) {
          crossRef.current.style.left = `${s.crossX}%`;
          crossRef.current.style.top = `${s.crossY}%`;
        }
        if (crossRef.current.getAttribute('data-turret') !== s.turretId) {
          crossRef.current.setAttribute('data-turret', s.turretId);
        }
        const isCharging = !!s.isCharging;
        const prog = isCharging ? Math.max(0, Math.min(1, s.reloadProgress)) : 0;
        crossRef.current.style.setProperty('--charge-prog', prog.toFixed(3));
        crossRef.current.classList.toggle('is-charging', isCharging);
        crossRef.current.classList.toggle('is-charged', isCharging && prog >= 0.96);
      }

      // Прицел lock-on (Гаусс), привязанный прямо к захваченному врагу
      if (lockTargetRef.current) {
        const active =
          !!s.hasLockTarget &&
          s.turretId === 'gauss' &&
          !!s.isCharging &&
          s.alive &&
          !s.paused &&
          s.mode === 'playing';
        lockTargetRef.current.classList.toggle('active', active);
        if (active && Number.isFinite(s.lockTargetX) && Number.isFinite(s.lockTargetY)) {
          lockTargetRef.current.style.left = `${s.lockTargetX}%`;
          lockTargetRef.current.style.top = `${s.lockTargetY}%`;
          const d = Math.max(5, s.lockTargetDist ?? 30);
          // Масштаб под дальность: на эталонных 30 м диаметр 72px, зажато в [24px, 140px]
          const px = Math.min(140, Math.max(24, Math.round((30 / d) * 72)));
          lockTargetRef.current.style.width = `${px}px`;
          lockTargetRef.current.style.height = `${px}px`;
          const prog = Math.max(0, Math.min(1, s.reloadProgress));
          lockTargetRef.current.style.setProperty('--charge-prog', prog.toFixed(3));
          lockTargetRef.current.classList.toggle('is-charged', prog >= 0.96);
        }
      }

      if (incomingLockRef.current) {
        const active = !!s.incomingLock && s.alive && !s.paused && s.mode === 'playing';
        incomingLockRef.current.classList.toggle('active', active);
      }

      if (game) drawMinimap(game, mapRef.current, mmBuf.current);

      // Threshold live region (M15) — announce only on discrete state crosses.
      if (liveRef.current) {
        const emptyMag =
          !s.reloading &&
          !s.isCharging &&
          s.turretId !== 'flamethrower' &&
          s.magazine > 0 &&
          s.ammo <= 0;
        // Меню/гараж держат alive=false — «смерть» объявляем только в бою.
        const dead = s.mode === 'playing' && !s.alive;
        const live = {
          lowHp, health: s.health, reloading: s.reloading,
          isCharging: !!s.isCharging, emptyMag, dead,
        };
        const key = liveRegionKey(live);
        if (key !== lastLiveKey.current) {
          lastLiveKey.current = key;
          liveRef.current.textContent = liveRegionText(live);
        }
      }

      // Гейт ре-рендера живёт в ui/hudRenderGate: по умолчанию сравниваются ВСЕ
      // поля снапшота, исключения — ref-painted/непрерывные/квантованные каналы.
      // Новое поле в HudSnapshot подхватывается автоматически.
      if (hudNeedsRender(c, s)) force();
      Object.assign(c, s);
      // HudModel переиспользует scratch-массивы для scoreboard и capturePoints;
      // неглубокое клонирование строк/точек сохраняет снимок кадра в c,
      // позволяя hudNeedsRender честно сравнивать кадры по содержимому.
      c.scoreboard = s.scoreboard.map((r) => ({ ...r }));
      c.capturePoints = s.capturePoints.map((p) => ({ ...p }));
    };
    game.setHudCallback(onHud);
    return () => game.setHudCallback(null);
  }, [game]);

  return {
    snap,
    feed, vignette, dmgArc, hitmark, showHint, frag, streak,
    setFeed, setVignette, setDmgArc, setHitmark, setShowHint, setFrag, setStreak,
    healthRef, healthNumRef, boostRef, reloadRef, crossRef, mapRef, liveRef,
    flameFillRef, ghostRef, lockTargetRef, incomingLockRef,
    mmBuf, feedId,
  };
}
