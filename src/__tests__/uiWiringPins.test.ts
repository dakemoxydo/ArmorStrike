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

  it('MP flows share the token: double-click quick/join/create cannot kill чужой ЗАГРУЗКА', () => {
    // handleQuickMatch / handleJoinRoom / handleCreateRoom обязаны брать тот же
    // монотонный startToken, что и runStartRound H5 (корректность флага
    // загрузки, не античит): stale MP-вызов не гасит спиннер свежего.
    const quick = app.match(/handleQuickMatch[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(quick, 'handleQuickMatch must take startToken').toBeTruthy();
    const join = app.match(/handleJoinRoom[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(join, 'handleJoinRoom must take startToken').toBeTruthy();
    const create = app.match(/handleCreateRoom[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(create, 'handleCreateRoom must take startToken').toBeTruthy();
    // Каждый MP-finally гейтится токеном (3 MP-флоу + runStartRound = 4 гейта).
    const gatedFinally = app.match(/if \(token === startToken\.current\) \{\s*setRoundLoading\(false\);/g) ?? [];
    expect(gatedFinally.length).toBeGreaterThanOrEqual(4);
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

describe('keyboard / rematch / network id wiring', () => {
  it('Escape ignores Auth/Quests/server browser; M ignores text fields', () => {
    expect(app).toMatch(/authModalOpen \|\| questsOpen \|\| serverBrowserOpen/);
    expect(app).toMatch(/e\.code === 'KeyM'[\s\S]{0,120}isInteractiveKeyboardTarget/);
  });

  it('pause ЗАНОВО rematches; MP join uses a stable network id', () => {
    expect(app).toMatch(/onRestart=\{rematch\}/);
    expect(app).toMatch(/userId: game\.getNetworkId\(\)/);
  });
});

describe('multiplayer host/client wiring', () => {
  it('host fills bots from the room flag; clients never spawn a local roster of bots', () => {
    const game = readFileSync(resolve(__dirname, '../game/Game.ts'), 'utf8');
    expect(game).toMatch(/botsEnabled: isHost && room\.bots_enabled/);
    expect(game).toMatch(/sim\.match\.replication = isHost \? 'host' : 'client'/);
    expect(game).toMatch(/sim\.networked = true/);
  });
});
