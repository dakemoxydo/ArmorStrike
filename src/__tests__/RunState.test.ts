import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RunState } from '../game/RunState';

describe('RunState', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
    });
  });

  it('resetRun обнуляет счёт и время', () => {
    const r = new RunState();
    r.score = 100;
    r.kills = 5;
    r.matchTime = 42;
    r.resetRun();
    expect(r.score).toBe(0);
    expect(r.kills).toBe(0);
    expect(r.matchTime).toBe(0);
  });

  it('save/load восстанавливает loadout', () => {
    const a = new RunState();
    a.currentHull = 'mammoth';
    a.currentTurret = 'cannon';
    a.save();

    const b = new RunState();
    b.load();
    expect(b.currentHull).toBe('mammoth');
    expect(b.currentTurret).toBe('cannon');
  });

  it('load игнорирует битый JSON и неизвестные id', () => {
    localStorage.setItem('as2_loadout', '{not json');
    const r = new RunState();
    r.load();
    expect(r.currentHull).toBe('hunter');
    expect(r.currentTurret).toBe('railgun');

    localStorage.setItem('as2_loadout', JSON.stringify({ hullId: 'nope', turretId: 'railgun' }));
    r.load();
    expect(r.currentHull).toBe('hunter');
  });

  it('конструктор восстанавливает сохранённый loadout без явного load() (A6)', () => {
    localStorage.setItem('as2_loadout', JSON.stringify({ hullId: 'mammoth', turretId: 'gauss' }));
    const r = new RunState();
    expect(r.currentHull).toBe('mammoth');
    expect(r.currentTurret).toBe('gauss');
  });

  it('load отвергает prototype-chain ключи вроде toString (A8)', () => {
    localStorage.setItem('as2_loadout', JSON.stringify({ hullId: 'toString', turretId: 'constructor' }));
    const r = new RunState();
    expect(r.currentHull).toBe('hunter');
    expect(r.currentTurret).toBe('railgun');
  });

  it('новый профиль стартует с нераспакованным комплектом и пустым инвентарём', () => {
    const r = new RunState();
    expect(r.starterPackClaimed).toBe(false);
    expect(r.unlockedHulls).toEqual([]);
    expect(r.unlockedTurrets).toEqual([]);
    expect(r.isHullUnlocked('viking')).toBe(false);
    expect(r.isTurretUnlocked('cannon')).toBe(false);
  });

  it('claimStarterPack открывает выбранные детали, устанавливает loadout и сохраняет', () => {
    const r = new RunState();
    r.claimStarterPack('viking', 'cannon');

    expect(r.starterPackClaimed).toBe(true);
    expect(r.currentHull).toBe('viking');
    expect(r.currentTurret).toBe('cannon');
    expect(r.unlockedHulls).toEqual(['viking']);
    expect(r.unlockedTurrets).toEqual(['cannon']);
    expect(r.isHullUnlocked('viking')).toBe(true);
    expect(r.isHullUnlocked('hunter')).toBe(false);
    expect(r.isTurretUnlocked('cannon')).toBe(true);
    expect(r.isTurretUnlocked('railgun')).toBe(false);

    // Восстановление при новой загрузке
    const loaded = new RunState();
    expect(loaded.starterPackClaimed).toBe(true);
    expect(loaded.currentHull).toBe('viking');
    expect(loaded.currentTurret).toBe('cannon');
    expect(loaded.isHullUnlocked('viking')).toBe(true);
    expect(loaded.isTurretUnlocked('cannon')).toBe(true);
  });

  it('claimStarterPack отклоняет невалидные id', () => {
    const r = new RunState();
    expect(() => {
      // @ts-expect-error test invalid hull id
      r.claimStarterPack('invalid_hull', 'cannon');
    }).toThrow(/Invalid starter pack/);
  });

  it('управляет балансом кредитов и защищает от списания в минус', () => {
    const r = new RunState();
    expect(r.credits).toBe(0);

    r.addCredits(500);
    expect(r.credits).toBe(500);

    // Успешная покупка
    const ok = r.spendCredits(300);
    expect(ok).toBe(true);
    expect(r.credits).toBe(200);

    // Недостаточно средств
    const fail = r.spendCredits(300);
    expect(fail).toBe(false);
    expect(r.credits).toBe(200);

    // Проверка сохранения баланса
    const loaded = new RunState();
    expect(loaded.credits).toBe(200);
  });

  it('claimQuest начисляет награду и ротирует задачу', () => {
    const r = new RunState();
    // Берём первый квест и искусственно завершаем его
    const firstQuest = r.quests[0];
    firstQuest.current = firstQuest.target;

    const reward = r.claimQuest(firstQuest.id);
    expect(reward).toBeGreaterThan(0);
    expect(r.credits).toBe(reward);

    // Слот заменился на новый квест с нулевым прогрессом
    expect(r.quests[0].current).toBe(0);
    expect(r.quests[0].claimed).toBe(false);
  });

  it('getNetworkId is stable for a guest session and prefers userId', () => {
    const r = new RunState();
    const a = r.getNetworkId();
    const b = r.getNetworkId();
    expect(a).toBe(b);
    expect(a.startsWith('usr_')).toBe(true);
    r.userId = 'auth-uuid';
    expect(r.getNetworkId()).toBe('auth-uuid');
  });

  it('resetToGuest clears account inventory from local storage', () => {
    const r = new RunState();
    r.userId = 'u1';
    r.isGuest = false;
    r.username = 'Ace';
    r.credits = 900;
    r.unlockedHulls = ['mammoth'];
    r.unlockedTurrets = ['gauss'];
    r.starterPackClaimed = true;
    r.resetToGuest();
    expect(r.isGuest).toBe(true);
    expect(r.userId).toBeNull();
    expect(r.username).toBe('Гость');
    expect(r.credits).toBe(0);
    expect(r.unlockedHulls).toEqual([]);
    expect(r.starterPackClaimed).toBe(false);
  });
});
