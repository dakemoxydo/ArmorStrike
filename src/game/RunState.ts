import type { GameMode } from './types';
import { HULLS, TURRETS } from '../core/catalog';
import type { HullId, TurretId } from '../core/catalog';
import {
  advanceQuestsOnMatchEnd,
  createInitialQuests,
  getQuestDef,
  rollNextQuest,
  type MatchSummaryForQuests,
  type QuestProgress,
} from './economy/questCatalog';

export const LS_KEY = 'as2_loadout';

export class RunState {
  mode: GameMode = 'menu';
  paused = false;
  score = 0;
  kills = 0;
  matchTime = 0;
  currentHull: HullId = 'hunter';
  currentTurret: TurretId = 'railgun';

  unlockedHulls: HullId[] = [];
  unlockedTurrets: TurretId[] = [];
  starterPackClaimed = false;

  /** Баланс игровой валюты (Кредиты CR). */
  credits = 0;
  /** Активные боевые задачи (3 слота). */
  quests: QuestProgress[] = createInitialQuests();

  constructor() {
    // Восстановление прошлого профиля/инвентаря при создании (A6)
    this.load();
  }

  isHullUnlocked(id: HullId): boolean {
    return this.unlockedHulls.includes(id);
  }

  isTurretUnlocked(id: TurretId): boolean {
    return this.unlockedTurrets.includes(id);
  }

  /** Начислить кредиты на баланс игрока. */
  addCredits(amount: number) {
    if (amount <= 0) return;
    this.credits += Math.floor(amount);
    this.save();
  }

  /** Списать кредиты. Возвращает true при успешном списании, false при нехватке. */
  spendCredits(amount: number): boolean {
    const cost = Math.floor(amount);
    if (cost <= 0) return true;
    if (this.credits < cost) return false;
    this.credits -= cost;
    this.save();
    return true;
  }

  /** Разблокировать корпус. */
  unlockHull(hullId: HullId): boolean {
    if (!Object.prototype.hasOwnProperty.call(HULLS, hullId)) return false;
    if (!this.unlockedHulls.includes(hullId)) {
      this.unlockedHulls.push(hullId);
      this.save();
    }
    return true;
  }

  /** Разблокировать башню. */
  unlockTurret(turretId: TurretId): boolean {
    if (!Object.prototype.hasOwnProperty.call(TURRETS, turretId)) return false;
    if (!this.unlockedTurrets.includes(turretId)) {
      this.unlockedTurrets.push(turretId);
      this.save();
    }
    return true;
  }

  /** Обновить прогресс квестов по итогам матча. */
  advanceQuests(summary: MatchSummaryForQuests) {
    this.quests = advanceQuestsOnMatchEnd(this.quests, summary);
    this.save();
  }

  /** Забрать награду за выполненный квест и получить новый из ротации. */
  claimQuest(questId: string): number {
    const idx = this.quests.findIndex((q) => q.id === questId);
    if (idx === -1) return 0;
    const q = this.quests[idx];
    if (q.current < q.target || q.claimed) return 0;

    const def = getQuestDef(q.id);
    const reward = def?.rewardCredits ?? 0;
    this.addCredits(reward);

    // Заменяем выполненный квест новым из пула (ротация)
    const next = rollNextQuest(this.quests.map((x) => x.id));
    this.quests[idx] = next;
    this.save();

    return reward;
  }

  /** Получение стартового комплекта новобранца (корпус + башня). */
  claimStarterPack(hullId: HullId, turretId: TurretId) {
    if (
      !Object.prototype.hasOwnProperty.call(HULLS, hullId) ||
      !Object.prototype.hasOwnProperty.call(TURRETS, turretId)
    ) {
      throw new Error(`Invalid starter pack selection: ${hullId}, ${turretId}`);
    }
    if (!this.unlockedHulls.includes(hullId)) {
      this.unlockedHulls.push(hullId);
    }
    if (!this.unlockedTurrets.includes(turretId)) {
      this.unlockedTurrets.push(turretId);
    }
    this.currentHull = hullId;
    this.currentTurret = turretId;
    this.starterPackClaimed = true;
    this.save();
  }

  /** Загрузить инвентарь и выбор корпуса/башни из предыдущих сессий. */
  load() {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          const unlockedHulls = Array.isArray(o.unlockedHulls)
            ? o.unlockedHulls.filter(
                (h: unknown): h is HullId =>
                  typeof h === 'string' && Object.prototype.hasOwnProperty.call(HULLS, h),
              )
            : [];
          const unlockedTurrets = Array.isArray(o.unlockedTurrets)
            ? o.unlockedTurrets.filter(
                (t: unknown): t is TurretId =>
                  typeof t === 'string' && Object.prototype.hasOwnProperty.call(TURRETS, t),
              )
            : [];
          const starterPackClaimed = Boolean(o.starterPackClaimed);

          this.unlockedHulls = unlockedHulls;
          this.unlockedTurrets = unlockedTurrets;
          this.starterPackClaimed = starterPackClaimed;

          // hasOwnProperty.call: prototype-chain guard (A8)
          if (
            typeof o.hullId === 'string' &&
            Object.prototype.hasOwnProperty.call(HULLS, o.hullId)
          ) {
            this.currentHull = o.hullId as HullId;
          }

          if (
            typeof o.turretId === 'string' &&
            Object.prototype.hasOwnProperty.call(TURRETS, o.turretId)
          ) {
            this.currentTurret = o.turretId as TurretId;
          }

          if (typeof o.credits === 'number' && Number.isFinite(o.credits)) {
            this.credits = Math.max(0, Math.floor(o.credits));
          }

          if (Array.isArray(o.quests) && o.quests.length > 0) {
            const valid = o.quests.filter((q: unknown): q is QuestProgress => {
              return (
                Boolean(q) &&
                typeof q === 'object' &&
                typeof (q as QuestProgress).id === 'string' &&
                typeof (q as QuestProgress).current === 'number' &&
                typeof (q as QuestProgress).target === 'number' &&
                typeof (q as QuestProgress).claimed === 'boolean'
              );
            });
            if (valid.length > 0) {
              this.quests = valid;
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  save() {
    try {
      if (typeof localStorage === 'undefined') return;
      const data = {
        version: 2,
        hullId: this.currentHull,
        turretId: this.currentTurret,
        unlockedHulls: this.unlockedHulls,
        unlockedTurrets: this.unlockedTurrets,
        starterPackClaimed: this.starterPackClaimed,
        credits: this.credits,
        quests: this.quests,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  /** Сброс счёта при старте нового матча. */
  resetRun() {
    this.score = 0;
    this.kills = 0;
    this.matchTime = 0;
  }
}
