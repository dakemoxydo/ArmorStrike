import type { FrameContext, SimSystem } from './types';
import type { NetworkSession } from '../../network/NetworkSession';

export class NetworkSyncStage implements SimSystem {
  readonly name = 'networkSync';
  private session: NetworkSession | null = null;

  setSession(session: NetworkSession | null) {
    this.session = session;
  }

  update(ctx: FrameContext): void {
    this.session?.tick(ctx);
  }
}
