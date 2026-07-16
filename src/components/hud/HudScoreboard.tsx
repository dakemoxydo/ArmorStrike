import { Trophy } from 'lucide-react';
import type { ScoreRow } from '../../game/types';

interface HudScoreboardProps {
  rows: ScoreRow[];
}

export default function HudScoreboard({ rows }: HudScoreboardProps) {
  return (
    <div className="scoreboard-overlay" role="dialog" aria-label="Табло боя">
      <div className="scoreboard-panel hud-panel">
        <div className="hud-label mb-3 flex items-center gap-2"><Trophy size={14} /> ТАБЛО БОЯ</div>
        <table className="scoreboard-table">
          <thead>
            <tr><th>ИМЯ</th><th>КОРПУС</th><th>БАШНЯ</th><th>ОРУЖИЕ</th><th>БРОНЯ</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.isPlayer ? 'row-player' : ''}>
                <td className={r.alive ? '' : 'dead'}>{r.name}</td>
                <td>{r.hull}</td>
                <td>{r.turret}</td>
                <td>{r.weaponName}</td>
                <td>
                  <div className="sb-hp">
                    <div style={{ width: `${Math.round(Math.max(0, Math.min(1, r.hpFrac)) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
