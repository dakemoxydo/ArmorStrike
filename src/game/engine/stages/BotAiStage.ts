// ===== Стадия: ИИ ботов + CP objective path =====
// Контракт аллокаций: update() не создаёт объектов на бот на кадр — позиции,
// ctx, ячейка фокуса и стаб «цели нет» живут в переиспользуемых полях ниже.
// Единственный остаточный литерал на кадр — результат pickAiFocus (чистая
// функция вне этой зоны ответственности).
import * as THREE from 'three';
import type { FrameContext, SimSystem } from './types';
import type { TankEntity } from '../../Tank';
import type { Arena } from '../../Arena';
import type { BotRoster } from '../../BotRoster';
import type { MatchRuntime } from '../../match/MatchRuntime';
import type { AICtx, AITarget } from '../../AI';
import type { Collider } from '../physics';
import type { TeamId } from '../../match/matchTypes';
import { allyLineBlockers, pickAiFocus } from '../../match/aiFocus';
import { objectiveFightRange } from '../../aiRoles';
import { TANK } from '../../constants';
import {
  pickObjectiveZone,
  shouldFightNearObjective,
  type ObjectiveZoneView,
} from '../../match/aiObjective';
import { BOT_NORMAL } from '../../match/matchConfig';
import { syncZoneViews } from './zoneViewCache';

export class BotAiStage implements SimSystem {
  readonly name = 'botAi';

  /** Per-bot sticky focus (id) for FFA thrash reduction. */
  private readonly _aiSticky = new Map<number, number>();
  /** Per-bot sticky capture zone id (CP objective). */
  private readonly _objSticky = new Map<number, string>();
  /** Reusable id→entity map rebuilt once per frame (avoids tanks.find per bot). */
  private readonly _tankById = new Map<number, TankEntity>();
  /** Per-bot reusable blocker buffers for allyLineBlockers (keyed by tank id). */
  private readonly _blockerBufs = new Map<number, TankEntity[]>();
  /** Last seen roster size — swap detector for the per-bot maps above. */
  private _rosterSize = 0;
  /** D6: id of the first bot — same-size rematch changes this, not size. */
  private _firstBotId = -1;
  /**
   * Cached zone views for CP mode. Rebuilt by syncZoneViews when the zone set
   * changes (map switch / match reset); owner/contested are refreshed in place
   * on stable ticks.
   */
  private _zoneViews: ObjectiveZoneView[] | null = null;
  /** Shared empty zone list for non-CP modes (no per-frame literal). */
  private readonly _emptyZones: ObjectiveZoneView[] = [];
  /** Точка прицела цели (центр корпуса) для вертикальной автонаводки бота. */
  private readonly _aimPoint = new THREE.Vector3();
  /**
   * Горячий путь ниже — без аллокаций на бот на кадр: стаб «цели нет»,
   * ячейка фокуса, ctx для ai.update и позиционные литералы для чистых
   * objective-хелперов. Раньше здесь было ~5 литералов + стаб на каждого
   * бота на каждом кадре (~2.5k аллокаций/с на 7 ботах).
   */
  private readonly _deadStub: AITarget = {
    position: new THREE.Vector3(), alive: false, vel: new THREE.Vector3(),
  };
  /** Ячейка {focus, canSee} из aiFocusForBot (вызывающий разбирает сразу). */
  private readonly _focusCell = { focus: this._deadStub, canSee: false };
  /** Один изменяемый ctx: AIController не хранит его после update. */
  private readonly _ctx: AICtx = {
    player: this._deadStub,
    bots: [],
    colliders: [],
    bounds: 0,
    moveHint: null,
  };
  /**
   * Позиция бота (+команда) для чистых objective-хелперов. `teamId` всегда
   * присваивается в ветке alpha/bravo до вызова — стартовое значение нужно
   * только для типа ячейки.
   */
  private readonly _objSelf = {
    x: 0, z: 0, teamId: 'alpha' as Exclude<TeamId, null>,
  };
  /** Позиция фокуса (врага) для shouldFightNearObjective (alive всегда true —
   *  мёртвый фокус передаётся как null). */
  private readonly _enemyPos = { x: 0, z: 0, alive: true };
  /** Точка захвата — moveHint (moveHintForZone создаёт новый литерал). */
  private readonly _hint = { x: 0, z: 0 };

  constructor(
    private bots: BotRoster,
    private arena: Arena,
    private match: MatchRuntime,
  ) {}

  /**
   * Drop per-bot caches (L-3): tank ids grow monotonically across rounds, so
   * a same-size rematch would otherwise keep dead-roster entries forever.
   */
  onRosterCleared(): void {
    this._aiSticky.clear();
    this._objSticky.clear();
    this._blockerBufs.clear();
    this._tankById.clear();
    this._rosterSize = 0;
    this._firstBotId = -1;
  }

  /**
   * Стаб «цели нет»: переиспользуемый, пересоздаётся при смене сущности
   * игрока (ссылки на его position/vel живые — как в старом литерале).
   */
  private deadStub(player: TankEntity): AITarget {
    if (this._deadStub.position !== player.position) {
      this._deadStub.position = player.position;
      this._deadStub.vel = player.vel;
    }
    return this._deadStub;
  }

  update(ctx: FrameContext): void {
    // Roster swap guard: tank ids grow monotonically across rounds, so stale
    // per-bot entries (sticky focus, objective sticky, blocker buffers) would
    // otherwise accumulate forever. D6: a same-size rematch keeps the count but
    // changes the first bot's id, so compare both (cheap O(1)).
    const rosterSize = this.bots.bots.length;
    const firstBotId = rosterSize ? this.bots.bots[0].tank.id : -1;
    if (this._rosterSize !== rosterSize || this._firstBotId !== firstBotId) {
      this._rosterSize = rosterSize;
      this._firstBotId = firstBotId;
      this._aiSticky.clear();
      this._objSticky.clear();
      this._blockerBufs.clear();
    }

    const p = ctx.player;
    const bounds = this.arena.half - 6;
    const cpMode = this.match.mode === 'capture_point';
    const zoneViews = cpMode ? this.zonesAsView() : this._emptyZones;

    // Rebuild id→entity lookup once per frame.
    this._tankById.clear();
    for (const t of ctx.tanks) this._tankById.set(t.id, t);

    const opts = this._ctx;
    opts.colliders = this.arena.colliders;
    opts.bounds = bounds;

    for (const b of this.bots.bots) {
      if (!b.tank.alive) {
        this._aiSticky.delete(b.tank.id);
        this._objSticky.delete(b.tank.id);
        continue;
      }

      const { focus, canSee } = this.aiFocusForBot(b.tank, p, ctx.tanks, this.arena.colliders);
      let moveHint: { x: number; z: number } | null = null;

      // P5: ~50% bots path to capture zones. AIController still aims at focus;
      // moveHint overrides drive unless close combat (see AIController).
      if (cpMode && b.objectiveDuty && zoneViews.length > 0) {
        const teamId = b.tank.teamId as Exclude<TeamId, null> | null;
        if (teamId === 'alpha' || teamId === 'bravo') {
          const stickyZ = this._objSticky.get(b.tank.id) ?? null;
          this._objSelf.x = b.tank.position.x;
          this._objSelf.z = b.tank.position.z;
          this._objSelf.teamId = teamId;
          const zone = pickObjectiveZone(
            this._objSelf,
            zoneViews,
            stickyZ,
          );
          if (zone) {
            this._objSticky.set(b.tank.id, zone.id);
            // Полоса боя — от дальности оружия ЭТОГО бота (objectiveFightRange),
            // не от обзора: раньше 55.25 м для всех, и огнемёт/изида бросали
            // захват из-за врага, до которого не достают.
            this._enemyPos.x = focus.position.x;
            this._enemyPos.z = focus.position.z;
            const fight = shouldFightNearObjective(
              this._objSelf,
              focus.alive ? this._enemyPos : null,
              zone,
              objectiveFightRange(b.tank.turretId, BOT_NORMAL.sightRange),
            );
            if (fight) {
              moveHint = null;
            } else {
              this._hint.x = zone.x;
              this._hint.z = zone.z;
              moveHint = this._hint;
            }
          }
        }
      } else {
        this._objSticky.delete(b.tank.id);
      }

      // Line-of-fire block: allies only (empty in FFA → free fire through peers).
      let blockers = this._blockerBufs.get(b.tank.id);
      if (!blockers) {
        blockers = [];
        this._blockerBufs.set(b.tank.id, blockers);
      }
      allyLineBlockers(b.tank, ctx.tanks, blockers);
      opts.player = focus;
      opts.bots = blockers;
      opts.moveHint = moveHint;
      b.ai.update(ctx.dt, opts);
      // Вертикальная автонаводка бота: тот же фокус, в который ИИ наводит
      // башню. Тангаж считается только когда цель видима (canSee) и жива —
      // иначе ствол возвращается в горизонт (сканирование/погоня вслепую).
      if (canSee && focus.alive) {
        this._aimPoint.set(
          focus.position.x,
          focus.position.y + TANK.aimCenterY,
          focus.position.z,
        );
        b.tank.setPitchAim(this._aimPoint);
      } else {
        b.tank.clearPitchAim();
      }
      // setFire deferred to WeaponFireStage (fires after the turret sync).
    }
  }

  /**
   * Multi-target hostile focus (DM FFA + team modes).
   * Uses isEnemy; sticky target; LoS-preferred when in sight.
   * Пишет в переиспользуемую ячейку — вызывающий разбирает {focus, canSee}
   * сразу же.
   */
  private aiFocusForBot(
    bot: TankEntity,
    player: TankEntity,
    tanks: TankEntity[],
    colliders: Collider[],
  ): { focus: AITarget; canSee: boolean } {
    const stickyId = this._aiSticky.get(bot.id) ?? -1;
    const { target, canSee } = pickAiFocus({
      self: bot,
      candidates: tanks,
      colliders,
      sightRange: BOT_NORMAL.sightRange,
      stickyId,
    });
    if (!target) {
      this._aiSticky.delete(bot.id);
      this._focusCell.focus = this.deadStub(player);
      this._focusCell.canSee = false;
      return this._focusCell;
    }
    this._aiSticky.set(bot.id, target.id);
    // Resolve live entity via pre-built map (O(1) instead of tanks.find).
    const ent = this._tankById.get(target.id);
    this._focusCell.focus = ent ? ent : this.deadStub(player);
    this._focusCell.canSee = ent ? canSee : false;
    return this._focusCell;
  }

  private zonesAsView(): ObjectiveZoneView[] {
    this._zoneViews = syncZoneViews(this._zoneViews, this.match.getCaptureZones());
    return this._zoneViews;
  }
}
