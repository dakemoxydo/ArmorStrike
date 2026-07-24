// ===== Стадия: ИИ ботов + CP objective path =====
import type { FrameContext, SimSystem } from './types';
import type { TankEntity } from '../../Tank';
import type { Arena } from '../../Arena';
import type { BotRoster } from '../../BotRoster';
import type { MatchRuntime } from '../../match/MatchRuntime';
import type { AITarget } from '../../AI';
import type { Collider } from '../physics';
import type { TeamId } from '../../match/matchTypes';
import { allyLineBlockers, pickAiFocus } from '../../match/aiFocus';
import {
  moveHintForZone,
  pickObjectiveZone,
  shouldFightNearObjective,
  type ObjectiveZoneView,
} from '../../match/aiObjective';
import { BOT_NORMAL } from '../../match/matchConfig';

function deadStub(player: TankEntity): AITarget {
  return { position: player.position, alive: false, vel: player.vel };
}

export class BotAiStage implements SimSystem {
  readonly name = 'botAi';

  /** Per-bot sticky focus (id) for FFA thrash reduction. */
  private readonly _aiSticky = new Map<number, number>();
  /** Per-bot sticky capture zone id (CP objective). */
  private readonly _objSticky = new Map<number, string>();
  /** Reusable id→entity map rebuilt once per frame (avoids tanks.find per bot). */
  private readonly _tankById = new Map<number, TankEntity>();

  constructor(
    private bots: BotRoster,
    private arena: Arena,
    private match: MatchRuntime,
  ) {}

  update(ctx: FrameContext): void {
    const p = ctx.player;
    const bounds = this.arena.half - 6;
    const cpMode = this.match.mode === 'capture_point';
    const zoneViews = cpMode ? this.zonesAsView() : [];

    // Rebuild id→entity lookup once per frame.
    this._tankById.clear();
    for (const t of ctx.tanks) this._tankById.set(t.id, t);

    for (const b of this.bots.bots) {
      if (!b.tank.alive) {
        b.tank.weapon?.setFire(false);
        this._aiSticky.delete(b.tank.id);
        this._objSticky.delete(b.tank.id);
        continue;
      }

      const focus = this.aiFocusForBot(b.tank, p, ctx.tanks, this.arena.colliders);
      let moveHint: { x: number; z: number } | null = null;

      // P5: ~50% bots path to capture zones. AIController still aims at focus;
      // moveHint overrides drive unless close combat (see AIController).
      if (cpMode && b.objectiveDuty && zoneViews.length > 0) {
        const teamId = b.tank.teamId as Exclude<TeamId, null> | null;
        if (teamId === 'alpha' || teamId === 'bravo') {
          const stickyZ = this._objSticky.get(b.tank.id) ?? null;
          const zone = pickObjectiveZone(
            { x: b.tank.position.x, z: b.tank.position.z, teamId },
            zoneViews,
            stickyZ,
          );
          if (zone) {
            this._objSticky.set(b.tank.id, zone.id);
            const enemyPos = focus.alive
              ? { x: focus.position.x, z: focus.position.z, alive: true }
              : null;
            // Always set path; close fight clears moveHint so engage code runs fully.
            const fight = shouldFightNearObjective(
              { x: b.tank.position.x, z: b.tank.position.z },
              enemyPos,
              zone,
              BOT_NORMAL.sightRange * 0.85,
            );
            moveHint = fight ? null : moveHintForZone(zone);
          }
        }
      } else {
        this._objSticky.delete(b.tank.id);
      }

      // Line-of-fire block: allies only (empty in FFA → free fire through peers).
      const allyBlockers = allyLineBlockers(b.tank, ctx.tanks);
      b.ai.update(ctx.dt, {
        player: focus,
        bots: allyBlockers,
        colliders: this.arena.colliders,
        bounds,
        moveHint,
      });
      b.tank.weapon?.setFire(b.ai.wantsFire);
    }
  }

  /**
   * Multi-target hostile focus (DM FFA + team modes).
   * Uses isEnemy; sticky target; LoS-preferred when in sight.
   */
  private aiFocusForBot(
    bot: TankEntity,
    player: TankEntity,
    tanks: TankEntity[],
    colliders: Collider[],
  ): AITarget {
    const stickyId = this._aiSticky.get(bot.id) ?? -1;
    const { target } = pickAiFocus({
      self: bot,
      candidates: tanks,
      colliders,
      sightRange: BOT_NORMAL.sightRange,
      stickyId,
    });
    if (!target) {
      this._aiSticky.delete(bot.id);
      return deadStub(player);
    }
    this._aiSticky.set(bot.id, target.id);
    // Resolve live entity via pre-built map (O(1) instead of tanks.find).
    const ent = this._tankById.get(target.id);
    return ent ?? deadStub(player);
  }

  private zonesAsView(): ObjectiveZoneView[] {
    return this.match.getCaptureZones().map((z) => ({
      id: z.id,
      x: z.x,
      z: z.z,
      radius: z.radius,
      owner: z.owner,
      contested: z.contested,
    }));
  }
}
