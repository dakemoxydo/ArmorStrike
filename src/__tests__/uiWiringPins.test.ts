/**
 * UI-wiring source pins (H5/H6 — батч аудита 2026-09-15).
 *
 * Функциональный рендер App с mock Game здесь нецелесообразен (boot-эффект
 * с WebGL), а гонки «вытесненного startRound» / двух источников mute —
 * структурные контракты между App/HUD/PauseMenu. Пинимся источником, как
 * принято для geometry-контрактов карт.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const hud = readFileSync(resolve(__dirname, '../components/HUD.tsx'), 'utf8');

describe('H5: startRound token race', () => {
  it('stale start cannot clear the loading flag or post an error toast', () => {
    // Монотонный токен на каждый вызов…
    expect(app).toMatch(/const token = \+\+startToken\.current;/);
    // …finally и catch сверяются с последним токеном.
    expect(app).toMatch(
      /finally \{\s*if \(token === startToken\.current\) \{\s*setRoundLoading\(false\);/,
    );
    expect(app).toMatch(
      /if \(token === startToken\.current\) \{\s*setRoundError\(/,
    );
  });
});

describe('H6: single mute source', () => {
  it('kill-feed button routes through the App-owned handler, not raw game.toggleMute', () => {
    // App передаёт владельца HUD'у…
    expect(app).toMatch(/<HUD[^>]*onToggleMute=\{toggleMute\}/);
    // …HUD дергает проп, direct-вызов только как fallback.
    expect(hud).toMatch(/if \(onToggleMute\) onToggleMute\(\);/);
    expect(hud).toMatch(/else game\?\.toggleMute\(\);/);
  });

  it('App.muted follows cross-tab writes to as2_muted', () => {
    expect(app).toMatch(/addEventListener\('storage'/);
    expect(app).toMatch(/e\.key === 'as2_muted'[\s\S]{0,80}setMuted\(e\.newValue === '1'\)/);
  });
});
