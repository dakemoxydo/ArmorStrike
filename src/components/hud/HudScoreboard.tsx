import { Trophy } from 'lucide-react';
import type { ScoreRow, TeamId } from '../../game/types';
import { scoreboardHpClass } from '../../ui/hudPresentation';

interface HudScoreboardProps {
  rows: ScoreRow[];
}

function TeamTable({
  title,
  className,
  rows,
}: {
  title: string;
  className: string;
  rows: ScoreRow[];
}) {
  return (
    <div className={`scoreboard-team ${className}`}>
      <div className="scoreboard-team-title">{title}</div>
      <table className="scoreboard-table">
        <thead>
          <tr><th>ИМЯ</th><th>K</th><th>D</th><th>КОРПУС</th><th>ОРУЖИЕ</th><th>БРОНЯ</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const frac = Math.max(0, Math.min(1, r.hpFrac));
            return (
              <tr key={`${title}-${i}`} className={r.isPlayer ? 'row-player' : ''}>
                <td className={r.alive ? '' : 'dead'}>{r.name}</td>
                <td>{r.kills}</td>
                <td>{r.deaths}</td>
                <td>{r.hull}</td>
                <td>{r.weaponName}</td>
                <td>
                  <div className="sb-hp" aria-label={`${Math.round(frac * 100)}%`}>
                    <div
                      className={scoreboardHpClass(frac)}
                      style={{ width: `${Math.round(frac * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FlatTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <table className="scoreboard-table">
      <thead>
        <tr><th>ИМЯ</th><th>K</th><th>D</th><th>КОРПУС</th><th>ОРУЖИЕ</th><th>БРОНЯ</th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const frac = Math.max(0, Math.min(1, r.hpFrac));
          return (
            <tr key={i} className={r.isPlayer ? 'row-player' : ''}>
              <td className={r.alive ? '' : 'dead'}>{r.name}</td>
              <td>{r.kills}</td>
              <td>{r.deaths}</td>
              <td>{r.hull}</td>
              <td>{r.weaponName}</td>
              <td>
                <div className="sb-hp" aria-label={`${Math.round(frac * 100)}%`}>
                  <div
                    className={scoreboardHpClass(frac)}
                    style={{ width: `${Math.round(frac * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function isTeamBoard(rows: ScoreRow[]): boolean {
  return rows.some((r) => r.teamId === 'alpha' || r.teamId === 'bravo');
}

function byTeam(rows: ScoreRow[], team: TeamId): ScoreRow[] {
  return rows
    .filter((r) => r.teamId === team)
    .sort((a, b) => b.kills - a.kills || (b.isPlayer ? 1 : 0) - (a.isPlayer ? 1 : 0));
}

export default function HudScoreboard({ rows }: HudScoreboardProps) {
  const teamMode = isTeamBoard(rows);
  const alpha = teamMode ? byTeam(rows, 'alpha') : [];
  const bravo = teamMode ? byTeam(rows, 'bravo') : [];

  return (
    <div className="scoreboard-overlay" role="region" aria-label="Табло боя">
      <div className={`scoreboard-panel hud-panel ${teamMode ? 'scoreboard-panel-teams' : ''}`}>
        <div className="hud-label mb-3 flex items-center gap-2">
          <Trophy size={14} aria-hidden /> ТАБЛО БОЯ
        </div>
        {teamMode ? (
          <div className="scoreboard-teams">
            <TeamTable title="ALPHA" className="team-col-alpha" rows={alpha} />
            <TeamTable title="BRAVO" className="team-col-bravo" rows={bravo} />
          </div>
        ) : (
          <FlatTable rows={rows} />
        )}
      </div>
    </div>
  );
}
