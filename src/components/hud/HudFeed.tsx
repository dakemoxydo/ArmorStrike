import { Skull, Volume2, VolumeX, Zap } from 'lucide-react';

export interface FeedEntry { id: number; victim: string; byPlayer: boolean }

interface HudFeedProps {
  feed: FeedEntry[];
  muted: boolean;
  onToggleMute: () => void;
}

export default function HudFeed({ feed, muted, onToggleMute }: HudFeedProps) {
  return (
    <div className="anim-up absolute right-[var(--hud-inset)] top-[var(--hud-inset)] flex flex-col items-end gap-2" style={{ '--d': '0.2s' } as React.CSSProperties}>
      <div className="pointer-events-auto anim-up" style={{ '--d': '0.1s' } as React.CSSProperties}>
        <button
          type="button"
          onClick={onToggleMute}
          className="btn-game btn-ghost btn-icon"
          title="Звук [M]"
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
        >
          {muted ? <VolumeX size={16} className="bicon" aria-hidden /> : <Volume2 size={16} className="bicon" aria-hidden />}
        </button>
      </div>
      <div className="flex flex-col items-end gap-1.5" aria-live="polite" aria-atomic="false">
        {feed.map((f) => (
          <div key={f.id} className={`feed-item${f.byPlayer ? ' is-player' : ''}`}>
            <span className="feed-icon" aria-hidden>
              {f.byPlayer
                ? <Zap size={11} className="text-emerald-300" />
                : <Skull size={11} className="text-red-400" />}
            </span>
            {f.byPlayer ? (
              <>ВЫ <span className="text-white/60">▸</span> <span className="text-red-300">{f.victim}</span></>
            ) : (
              <>{f.victim} <span className="text-white/60">уничтожен</span></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
