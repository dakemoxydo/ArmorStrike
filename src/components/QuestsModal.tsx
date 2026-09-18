import { useEffect } from 'react';
import { CheckCircle2, Coins, Flame, Sparkles, Swords, Target, Trophy, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { GameApi } from '../game/GameApi';
import { getQuestDef, type QuestProgress } from '../game/economy/questCatalog';

interface QuestsModalProps {
  game: GameApi | null;
  onClose: () => void;
}

function getQuestIcon(type?: string) {
  switch (type) {
    case 'kills':
      return <Target size={20} className="text-red-400" aria-hidden />;
    case 'streak':
      return <Flame size={20} className="text-orange-400" aria-hidden />;
    case 'win_any':
    case 'win_tdm':
      return <Trophy size={20} className="text-amber-400" aria-hidden />;
    case 'capture_points':
      return <Swords size={20} className="text-cyan-400" aria-hidden />;
    default:
      return <Sparkles size={20} className="text-emerald-400" aria-hidden />;
  }
}

export default function QuestsModal({ game, onClose }: QuestsModalProps) {
  const trapRef = useFocusTrap(true);
  const quests: readonly QuestProgress[] = game?.quests ?? [];
  const credits = game?.credits ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleClaim = (questId: string) => {
    if (!game) return;
    game.claimQuest(questId);
  };

  return (
    <div
      ref={trapRef}
      className="scrim-over fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quests-modal-title"
    >
      <div className="hud-panel relative flex w-full max-w-2xl flex-col gap-6 p-6 md:p-8 bg-[#070d14]/95 border border-cyan-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Trophy size={26} className="text-amber-400" aria-hidden />
            <div>
              <h2 id="quests-modal-title" className="font-display text-2xl tracking-wide text-white">
                БОЕВЫЕ ЗАДАЧИ
              </h2>
              <p className="text-xs tracking-wider text-white/60 mt-0.5">
                Выполняйте контракты в боях для заработка кредитов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hud-panel flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20">
              <Coins size={16} className="text-amber-400" aria-hidden />
              <span className="font-display text-base text-amber-300">{credits}</span>
              <span className="text-[10px] tracking-wider text-amber-400/80">CR</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-game btn-ghost p-2 text-white/70 hover:text-white"
              aria-label="Закрыть задачи"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Quests list */}
        <div className="flex flex-col gap-3">
          {quests.map((q) => {
            const def = getQuestDef(q.id);
            const isCompleted = q.current >= q.target;
            const pct = Math.min(100, Math.round((q.current / q.target) * 100));

            return (
              <div
                key={q.id}
                className={`hud-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border transition-colors ${
                  isCompleted
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="cut-chip mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center bg-black/40 border border-white/10">
                    {getQuestIcon(def?.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm tracking-wide text-white">
                        {def?.title ?? q.id}
                      </span>
                      {isCompleted && (
                        <span className="cut-chip inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300 font-bold tracking-wider">
                          <CheckCircle2 size={11} aria-hidden /> ВЫПОЛНЕНО
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/60 leading-snug">
                      {def?.desc ?? 'Выполните боевое условие'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="cut-chip relative h-2 flex-1 bg-black/40 border border-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              : 'bg-gradient-to-r from-amber-500 to-cyan-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-display text-white/80">
                        {Math.min(q.current, q.target)} / {q.target}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <Coins size={15} aria-hidden />
                    <span className="font-display text-sm">+{def?.rewardCredits ?? 0}</span>
                    <span className="text-[10px] tracking-wider text-amber-400/80">CR</span>
                  </div>

                  {isCompleted ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleClaim(q.id)}
                        className="btn-game btn-primary px-4 py-2 text-xs"
                      >
                        <span>ЗАБРАТЬ</span>
                      </button>
                    </div>
                  ) : (
                    <span className="cut-chip bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] text-white/50 tracking-wider">
                      В ПРОЦЕССЕ
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-white/50 border-t border-white/10 pt-4">
          <span>После получения награды выдаётся новая задача из ротации</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-game btn-ghost px-5 py-2 text-xs"
          >
            <span>ЗАКРЫТЬ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
