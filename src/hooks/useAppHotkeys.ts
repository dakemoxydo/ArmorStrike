import { useEffect } from 'react';
import type { GameApi } from '../game/GameApi';
import type { GameMode } from '../game/types';
import { isInteractiveKeyboardTarget } from '../ui/keyboardTarget';

export interface HotkeyDeps {
  game: GameApi | null;
  uiMode: GameMode;
  mapSelectOpen: boolean;
  modeSelectOpen: boolean;
  authModalOpen: boolean;
  questsOpen: boolean;
  leaderboardOpen: boolean;
  serverBrowserOpen: boolean;
  goMenu: () => void;
  openModeSelect: () => void;
  onToggleMute: () => void;
}

/**
 * Global window keydown handler: Escape (pause / garage→menu), M (mute),
 * Enter (menu → ModeSelect). All gated by modal-open state and
 * `isInteractiveKeyboardTarget` so focused controls own their keys.
 */
export function useAppHotkeys(deps: HotkeyDeps): void {
  const {
    game,
    uiMode,
    mapSelectOpen,
    modeSelectOpen,
    authModalOpen,
    questsOpen,
    leaderboardOpen,
    serverBrowserOpen,
    goMenu,
    openModeSelect,
    onToggleMute,
  } = deps;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game) return;
      // Mode/map select own Escape / Enter while open.
      if (
        mapSelectOpen ||
        modeSelectOpen ||
        authModalOpen ||
        questsOpen ||
        leaderboardOpen ||
        serverBrowserOpen
      ) return;
      if (e.code === 'Escape') {
        if (uiMode === 'playing') game.togglePause();
        else if (uiMode === 'garage') goMenu();
      }
      if (e.code === 'KeyM') {
        if (isInteractiveKeyboardTarget(e.target)) return;
        onToggleMute();
      }
      // Enter opens mode select when focus is not already on a control
      if (e.code === 'Enter' && uiMode === 'menu' && !isInteractiveKeyboardTarget(e.target)) {
        openModeSelect();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, uiMode, goMenu, openModeSelect, onToggleMute, mapSelectOpen, modeSelectOpen, authModalOpen, questsOpen, leaderboardOpen, serverBrowserOpen]);
}
