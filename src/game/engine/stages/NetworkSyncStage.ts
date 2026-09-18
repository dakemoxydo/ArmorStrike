import type { FrameContext, SimSystem } from './types';
import type { MultiplayerService } from '../../network/multiplayerService';
import type { RemotePlayerManager } from '../../network/RemotePlayerManager';
import type { PlayerController } from '../../PlayerController';

export class NetworkSyncStage implements SimSystem {
  readonly name = 'networkSync';

  private syncTimer = 0;
  private readonly syncInterval = 0.05; // 20 Hz
  private wasFiring = false;

  constructor(
    private multiplayer: MultiplayerService | null,
    private remotePlayers: RemotePlayerManager | null,
    private input: PlayerController,
    private userId: string,
  ) {}

  setServices(multiplayer: MultiplayerService | null, remotePlayers: RemotePlayerManager | null, userId: string) {
    this.multiplayer = multiplayer;
    this.remotePlayers = remotePlayers;
    this.userId = userId;
  }

  update(ctx: FrameContext): void {
    // 1. Update remote peers interpolation
    if (this.remotePlayers) {
      this.remotePlayers.update(ctx.dt);
    }

    // 2. Broadcast local player state if connected to multiplayer
    if (!this.multiplayer || !ctx.player) return;

    const p = ctx.player;
    this.syncTimer += ctx.dt;

    if (this.syncTimer >= this.syncInterval && p.alive) {
      this.syncTimer = 0;
      this.multiplayer.sendTransform({
        userId: this.userId,
        x: Math.round(p.position.x * 100) / 100,
        z: Math.round(p.position.z * 100) / 100,
        yaw: Math.round(p.yaw * 1000) / 1000,
        aimYaw: Math.round(p.aimYaw * 1000) / 1000,
        barrelPitch: Math.round(p.barrelPitch * 1000) / 1000,
        speed: Math.round(p.speed * 10) / 10,
        boosting: Boolean(p.boosting),
        timestamp: performance.now(),
      });
    }

    // 3. Fire events
    const isFiring = Boolean(p.alive && this.input.wantsFire);
    if (isFiring && (!this.wasFiring || p.turretId === 'flamethrower' || p.turretId === 'isida')) {
      if (p.turretId) {
        const origin: [number, number, number] = [p.position.x, 1.2, p.position.z];
        const dir: [number, number, number] = [
          Math.sin(p.aimYaw),
          Math.sin(p.barrelPitch),
          Math.cos(p.aimYaw),
        ];
        this.multiplayer.sendFire({
          userId: this.userId,
          turretId: p.turretId,
          origin,
          dir,
          barrelPitch: p.barrelPitch,
          timestamp: performance.now(),
        });
      }
    }
    this.wasFiring = isFiring;
  }
}
