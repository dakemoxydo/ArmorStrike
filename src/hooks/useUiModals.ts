import { useReducer, type Dispatch } from 'react';
import type { AuthTab } from '../components/auth/AuthModal';

export interface UiModalsState {
  modeSelectOpen: boolean;
  mapSelectOpen: boolean;
  questsOpen: boolean;
  leaderboardOpen: boolean;
  authModalOpen: boolean;
  authModalInitialTab: AuthTab;
  serverBrowserOpen: boolean;
  settingsOpen: boolean;
}

export type UiModalsAction =
  | { type: 'openModeSelect' }
  | { type: 'closeModeSelect' }
  | { type: 'openMapSelect' }
  | { type: 'closeMapSelect' }
  | { type: 'openQuests' }
  | { type: 'closeQuests' }
  | { type: 'openLeaderboard' }
  | { type: 'closeLeaderboard' }
  | { type: 'openAuth'; tab?: AuthTab }
  | { type: 'closeAuth' }
  | { type: 'openServerBrowser' }
  | { type: 'closeServerBrowser' }
  | { type: 'openSettings' }
  | { type: 'closeSettings' };

const initialState: UiModalsState = {
  modeSelectOpen: false,
  mapSelectOpen: false,
  questsOpen: false,
  leaderboardOpen: false,
  authModalOpen: false,
  authModalInitialTab: 'login',
  serverBrowserOpen: false,
  settingsOpen: false,
};

function uiModalsReducer(state: UiModalsState, action: UiModalsAction): UiModalsState {
  switch (action.type) {
    case 'openModeSelect':
      return { ...state, modeSelectOpen: true, mapSelectOpen: false };
    case 'closeModeSelect':
      return { ...state, modeSelectOpen: false };
    case 'openMapSelect':
      return { ...state, mapSelectOpen: true, modeSelectOpen: false };
    case 'closeMapSelect':
      return { ...state, mapSelectOpen: false };
    case 'openQuests':
      return { ...state, questsOpen: true };
    case 'closeQuests':
      return { ...state, questsOpen: false };
    case 'openLeaderboard':
      return { ...state, leaderboardOpen: true };
    case 'closeLeaderboard':
      return { ...state, leaderboardOpen: false };
    case 'openAuth':
      return { ...state, authModalOpen: true, authModalInitialTab: action.tab ?? 'login' };
    case 'closeAuth':
      return { ...state, authModalOpen: false };
    case 'openServerBrowser':
      return { ...state, serverBrowserOpen: true };
    case 'closeServerBrowser':
      return { ...state, serverBrowserOpen: false };
    case 'openSettings':
      return { ...state, settingsOpen: true };
    case 'closeSettings':
      return { ...state, settingsOpen: false };
    default:
      return state;
  }
}

export function useUiModals(): [UiModalsState, Dispatch<UiModalsAction>] {
  const [state, dispatch] = useReducer(uiModalsReducer, initialState);
  return [state, dispatch];
}
