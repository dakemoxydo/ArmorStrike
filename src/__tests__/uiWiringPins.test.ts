/**
 * UI-wiring source pins (H5/H6 — батч аудита 2026-09-15).
 *
 * Функциональный рендер App с mock Game здесь нецелесообразен (boot-эффект
 * с WebGL), а гонки «вытесненного startRound» / двух источников mute —
 * структурные контракты между хуками/HUD. Пинимся источником, как принято
 * для geometry-контрактов карт. Поведенческие тесты гонок — в appFlow.test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const hud = readFileSync(resolve(__dirname, '../components/HUD.tsx'), 'utf8');
const roundFlow = readFileSync(resolve(__dirname, '../hooks/useRoundFlow.ts'), 'utf8');
const appSettings = readFileSync(resolve(__dirname, '../hooks/useAppSettings.ts'), 'utf8');
const appHotkeys = readFileSync(resolve(__dirname, '../hooks/useAppHotkeys.ts'), 'utf8');

describe('H5: startRound token race', () => {
  it('stale start cannot clear the loading flag or post an error toast', () => {
    // Монотонный токен на каждый вызов…
    expect(roundFlow).toMatch(/const token = \+\+startToken\.current;/);
    // …finally и catch сверяются с последним токеном.
    expect(roundFlow).toMatch(
      /finally \{\s*if \(token === startToken\.current\) \{\s*setRoundLoading\(false\);/,
    );
    expect(roundFlow).toMatch(
      /if \(token === startToken\.current\) \{\s*setRoundError\(/,
    );
  });

  it('MP flows share the token: double-click quick/join/create cannot kill чужой ЗАГРУЗКА', () => {
    // handleQuickMatch / handleJoinRoom / handleCreateRoom обязаны брать тот же
    // монотонный startToken, что и runStartRound H5 (корректность флага
    // загрузки, не античит): stale MP-вызов не гасит спиннер свежего.
    const quick = roundFlow.match(/handleQuickMatch[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(quick, 'handleQuickMatch must take startToken').toBeTruthy();
    const join = roundFlow.match(/handleJoinRoom[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(join, 'handleJoinRoom must take startToken').toBeTruthy();
    const create = roundFlow.match(/handleCreateRoom[\s\S]{0,400}const token = \+\+startToken\.current;/)?.[0];
    expect(create, 'handleCreateRoom must take startToken').toBeTruthy();
    // Каждый MP-finally гейтится токеном (3 MP-флоу + runStartRound = 4 гейта).
    const gatedFinally = roundFlow.match(/if \(token === startToken\.current\) \{\s*setRoundLoading\(false\);/g) ?? [];
    expect(gatedFinally.length).toBeGreaterThanOrEqual(4);
  });
});

describe('H6: single mute source', () => {
  it('kill-feed button routes through the App-owned handler, not raw game.toggleMute', () => {
    // App передаёт владельца HUD'у…
    expect(app).toMatch(/<HUD[\s\S]{0,300}?onToggleMute=\{toggleMute\}/);
    // …HUD дергает проп, direct-вызов только как fallback.
    expect(hud).toMatch(/if \(onToggleMute\) onToggleMute\(\);/);
    expect(hud).toMatch(/else game\?\.toggleMute\(\);/);
  });

  it('muted state follows cross-tab writes to as2_muted', () => {
    expect(appSettings).toMatch(/addEventListener\('storage'/);
    expect(appSettings).toMatch(/e\.key === 'as2_muted'[\s\S]{0,80}setMuted\(e\.newValue === '1'\)/);
  });
});

describe('keyboard / rematch / network id wiring', () => {
  it('Escape ignores Auth/Quests/Leaderboard/server browser; M ignores text fields', () => {
    expect(appHotkeys).toMatch(
      /authModalOpen\s*\|\|\s*questsOpen\s*\|\|\s*leaderboardOpen\s*\|\|\s*serverBrowserOpen/,
    );
    expect(appHotkeys).toMatch(/e\.code === 'KeyM'[\s\S]{0,120}isInteractiveKeyboardTarget/);
  });

  it('pause ЗАНОВО rematches; MP join uses a stable network id', () => {
    expect(app).toMatch(/onRestart=\{rematch\}/);
    expect(roundFlow).toMatch(/userId: game\.getNetworkId\(\)/);
  });
});

describe('L3: global leaderboard wiring', () => {
  it('gameOver auto-submits once per event with a mono token (StrictMode-safe)', () => {
    const bootstrap = readFileSync(resolve(__dirname, '../hooks/useGameBootstrap.ts'), 'utf8');
    expect(bootstrap).toMatch(/const token = \+\+leaderboardToken\.current;/);
    expect(bootstrap).toMatch(
      /if \(token === leaderboardToken\.current\) \{\s*setLeaderboardSubmit\(result\);/,
    );
    expect(bootstrap).toMatch(/void LeaderboardService\.submitMatchResult\(/);
    expect(bootstrap).toMatch(/setLeaderboardSubmit\('pending'\);/);
  });

  it('App opens LeaderboardModal and passes submit status to GameOverScreen', () => {
    expect(app).toMatch(/import LeaderboardModal from '\.\/components\/LeaderboardModal';/);
    expect(app).toMatch(/modals\.leaderboardOpen && <LeaderboardModal/);
    expect(app).toMatch(/leaderboardSubmit=\{leaderboardSubmit\}/);
    expect(app).toMatch(/onLeaderboard=\{openLeaderboard\}/);
  });

  it('writes go only through submit_leaderboard_entry RPC (no direct table upsert)', () => {
    const svc = readFileSync(
      resolve(__dirname, '../game/leaderboard/leaderboardService.ts'),
      'utf8',
    );
    expect(svc).toMatch(/supabase\.rpc\('submit_leaderboard_entry'/);
    expect(svc).not.toMatch(/from\('leaderboard'\)[\s\S]{0,80}\.(insert|upsert|update)\(/);
  });

  it('migration enables RLS, grants only SELECT, and keeps write path in SECURITY DEFINER RPC', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20260922120000_create_leaderboard.sql'),
      'utf8',
    );
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/grant select on public\.leaderboard to anon, authenticated/);
    expect(sql).toMatch(/revoke all on public\.leaderboard from anon, authenticated/);
    expect(sql).not.toMatch(/grant (insert|update|delete|all) on public\.leaderboard/);
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/create or replace function public\.submit_leaderboard_entry/);
    expect(sql).toMatch(/greatest\(public\.leaderboard\.best_score, excluded\.best_score\)/);
    expect(sql).toMatch(/select auth\.uid\(\)/);
    expect(sql).toMatch(/from public\.profiles/);
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
