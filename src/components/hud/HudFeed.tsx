import { Skull, Volume2, VolumeX, Zap } from 'lucide-react';

export interface FeedEntry { id: number; victim: string; byPlayer: boolean }

interface HudFeedProps {
  feed: FeedEntry[];
  muted: boolean;
  onToggleMute: () => void;
}

export default function HudFeed({ feed, muted, onToggleMute }: HudFeedProps) {
  return (
    <div className="anim-up absolute right-5 top-5 flex flex-col items-end gap-2" style={{ '--d': '0.2s' } as React.CSSProperties}>
      <div className="pointer-events-auto anim-up" style={{ '--d': '0.1s' } as React.CSSProperties}>
        <button
          type="button"
          onClick={onToggleMute}
          className="btn-game btn-ghost h-9 w-9 px-0 py-0"
          title="Звук [M]"
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          {muted ? <VolumeX size={16} className="bicon" /> : <Volume2 size={16} className="bicon" />}
        </button>
      </div>
      <div className="flex flex-col items-end gap-1.5" aria-live="polite" aria-atomic="false">
        {feed.map((f) => (
          <div key={f.id} className="feed-item">
            {f.byPlayer ? (
              <><Zap size={11} className="text-emerald-300" /> ВЫ <span className="text-white/30">▸</span> <span className="text-red-300">{f.victim}</span></>
            ) : (
              <><Skull size={11} className="text-red-400" /> {f.victim} <span className="text-white/30">уничтожен</span></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
