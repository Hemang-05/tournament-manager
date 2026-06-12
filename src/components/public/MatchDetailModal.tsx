'use client';

import React, { useEffect } from 'react';
import { User, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  manager_name?: string | null;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
  role?: string | null;
  position?: string | null;
}

interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  type: string;
  minute: number;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage?: string | null;
  match_date?: string | null;
  kick_off_time?: string | null;
  match_events?: MatchEvent[];
}

interface MatchDetailModalProps {
  match: Match | null;
  teams: Team[];
  players: Player[];
  onClose: () => void;
}

export default function MatchDetailModal({
  match,
  teams,
  players,
  onClose,
}: MatchDetailModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (match) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [match]);

  if (!match) return null;

  const homeTeam = teams.find((t) => t.id === match.home_team_id);
  const awayTeam = teams.find((t) => t.id === match.away_team_id);

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const homePlayers = players.filter((p) => p.team_id === match.home_team_id);
  const awayPlayers = players.filter((p) => p.team_id === match.away_team_id);

  const getPlayerGoals = (playerId: string) => {
    if (!match.match_events) return [];
    return match.match_events.filter(
      (e) =>
        e.player_id === playerId &&
        (e.type?.toLowerCase() === 'goal' || e.type?.toLowerCase() === 'own_goal')
    );
  };

  const renderPlayerGoals = (playerId: string) => {
    const events = getPlayerGoals(playerId);
    if (events.length === 0) return null;

    return (
      <span className="flex items-center gap-1 text-[11px] text-[#00D084] font-mono bg-[#00D084]/5 px-2 py-0.5 rounded border border-[#00D084]/15 font-bold flex-shrink-0">
        ⚽ {events.map((e) => `${e.minute}'${e.type?.toLowerCase() === 'own_goal' ? ' (OG)' : ''}`).join(', ')}
      </span>
    );
  };

  const isLive = match.status?.toLowerCase() === 'live';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Scoreboard Header */}
        <div className="bg-[#0A1628] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-500 rounded-lg p-1.5"
          >
            <X size={18} />
          </button>

          <div className="text-center mb-3">
            <span className="inline-flex items-center rounded-full bg-[#00D084]/20 border border-[#00D084]/30 px-3 py-0.5 text-[10px] font-bold text-[#00D084] uppercase tracking-wider">
              {match.stage || 'Match'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 px-2">
            {/* Home Team */}
            <div className="flex flex-1 flex-col items-center text-center gap-2 min-w-0">
              <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || 'H')} />
              <h4 className="font-bold text-sm sm:text-base truncate w-full">{homeTeam?.name || 'Home Team'}</h4>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center justify-center flex-shrink-0 px-2">
              <div className="font-mono text-3xl sm:text-4xl font-black text-[#00D084] tracking-tight bg-white/5 border border-white/15 px-5 py-2 rounded-xl shadow-inner leading-none">
                {match.home_score ?? 0} - {match.away_score ?? 0}
              </div>
              <span className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                isLive ? 'text-white bg-green-500 animate-pulse' : 'text-slate-400 bg-white/5'
              }`}>
                {isLive ? 'LIVE' : 'FT'}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex flex-1 flex-col items-center text-center gap-2 min-w-0">
              <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || 'A')} />
              <h4 className="font-bold text-sm sm:text-base truncate w-full">{awayTeam?.name || 'Away Team'}</h4>
            </div>
          </div>
        </div>

        {/* Squad lists */}
        <div className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Home Squad */}
          <div className="space-y-4 pb-4 md:pb-0 md:pr-6">
            <div className="flex flex-col gap-1">
              <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{homeTeam?.name} Squad</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">{homePlayers.length} Players</span>
              </h5>
              {homeTeam?.manager_name && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <User size={12} className="text-slate-400 flex-shrink-0" />
                  <span>Manager: <span className="font-semibold text-slate-700">{homeTeam.manager_name}</span></span>
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {homePlayers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No players registered.</p>
              ) : (
                homePlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2.5 border border-slate-50 hover:bg-slate-50/50 rounded-xl transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                        <User size={14} />
                      </div>
                      <span className="font-semibold text-slate-800 text-xs truncate">{player.name}</span>
                    </div>
                    {renderPlayerGoals(player.id)}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Away Squad */}
          <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
            <div className="flex flex-col gap-1">
              <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{awayTeam?.name} Squad</span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">{awayPlayers.length} Players</span>
              </h5>
              {awayTeam?.manager_name && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <User size={12} className="text-slate-400 flex-shrink-0" />
                  <span>Manager: <span className="font-semibold text-slate-700">{awayTeam.manager_name}</span></span>
                </div>
              )}
            </div>
            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {awayPlayers.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No players registered.</p>
              ) : (
                awayPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2.5 border border-slate-50 hover:bg-slate-50/50 rounded-xl transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                        <User size={14} />
                      </div>
                      <span className="font-semibold text-slate-800 text-xs truncate">{player.name}</span>
                    </div>
                    {renderPlayerGoals(player.id)}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function TeamLogo({ team, fallbackText }: { team?: Team; fallbackText: string }) {
  return (
    <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center bg-white/5 relative">
      {team?.logo_url ? (
        <img src={team.logo_url} className="w-full h-full object-cover" alt="" />
      ) : (
        <span className="text-sm font-black text-[#00D084]">{fallbackText}</span>
      )}
    </div>
  );
}
