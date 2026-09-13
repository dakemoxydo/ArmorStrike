import { describe, it, expect } from 'vitest';

/**
 * Mirrors GameModeController startRound sequencing: chain + seq, latest wins,
 * superseded jobs skip apply. Pure logic unit test (no Three.js).
 */
function createStartQueue() {
  let startSeq = 0;
  let startChain: Promise<void> = Promise.resolve();
  const applied: number[] = [];
  const started: number[] = [];

  function startRound(delayMs: number): Promise<void> {
    const seq = ++startSeq;
    const job = startChain.then(() => execute(seq, delayMs));
    startChain = job.catch(() => undefined);
    return job;
  }

  async function execute(seq: number, delayMs: number) {
    if (seq !== startSeq) return;
    started.push(seq);
    await new Promise((r) => setTimeout(r, delayMs)); // e.g. spawnMatchRoster
    if (seq !== startSeq) return;
    await new Promise((r) => setTimeout(r, delayMs)); // e.g. renderWorld.warmUp
    // Mirrors GameModeController: the seq must survive BOTH awaits — leaving
    // to menu during the shader warm-up window must not apply the round.
    if (seq !== startSeq) return;
    applied.push(seq);
  }

  function invalidate() {
    startSeq += 1;
  }

  return { startRound, invalidate, applied, started, getSeq: () => startSeq };
}

describe('startRound queue (seq + chain)', () => {
  it('serializes concurrent starts; only latest applies', async () => {
    const q = createStartQueue();
    const a = q.startRound(30);
    const b = q.startRound(5);
    const c = q.startRound(5);
    await Promise.all([a, b, c]);
    expect(q.applied).toEqual([3]);
    // Job 1 may have started before 2/3 were queued; 2/3 must both run after 1
    // or be skipped if superseded before start — at least latest applied once.
    expect(q.applied[0]).toBe(q.getSeq());
  });

  it('leave/invalidate after start prevents apply', async () => {
    const q = createStartQueue();
    const p = q.startRound(20);
    q.invalidate();
    await p;
    expect(q.applied).toEqual([]);
  });

  it('invalidate during the warm-up window (second await) prevents apply', async () => {
    // Regression: the stale-seq check used to exist only after the spawn
    // await; leaving to menu while shaders compiled still applied `playing`.
    const q = createStartQueue();
    const p = q.startRound(20);
    await new Promise((r) => setTimeout(r, 25)); // first await done, second running
    q.invalidate();
    await p;
    expect(q.applied).toEqual([]);
  });
});
