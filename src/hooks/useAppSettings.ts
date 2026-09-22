import { useCallback, useEffect, useState } from 'react';
import type { GameApi } from '../game/GameApi';
import { loadMuted } from '../game/audio';
import {
  loadCrosshairStyle,
  saveCrosshairStyle,
  type CrosshairStyle,
} from '../ui/crosshairStyle';
import { loadDamageNumbers, saveDamageNumbers } from '../ui/damageNumbersSetting';

export interface AppSettings {
  muted: boolean;
  crosshair: CrosshairStyle;
  damageNumbers: boolean;
  toggleMute: () => void;
  changeCrosshair: (style: CrosshairStyle) => void;
  changeDamageNumbers: (on: boolean) => void;
}

/**
 * Owns mute flag (with cross-tab `as2_muted` sync H6), crosshair preset,
 * and damage-numbers toggle — all persisted to localStorage.
 */
export function useAppSettings(game: GameApi | null): AppSettings {
  const [muted, setMuted] = useState(loadMuted);
  const [crosshair, setCrosshair] = useState<CrosshairStyle>(loadCrosshairStyle);
  const [damageNumbers, setDamageNumbers] = useState<boolean>(loadDamageNumbers);

  const toggleMute = useCallback(() => {
    if (!game) return;
    const nowMuted = game.toggleMute();
    setMuted(nowMuted);
  }, [game]);

  const changeCrosshair = useCallback((style: CrosshairStyle) => {
    saveCrosshairStyle(style);
    setCrosshair(style);
  }, []);

  const changeDamageNumbers = useCallback((on: boolean) => {
    saveDamageNumbers(on);
    setDamageNumbers(on);
  }, []);

  // H6: кросс-вкладочная синхронизация флага mute
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'as2_muted') setMuted(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { muted, crosshair, damageNumbers, toggleMute, changeCrosshair, changeDamageNumbers };
}
