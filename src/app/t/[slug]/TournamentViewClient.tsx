'use client';

import { useState, useEffect } from 'react';
import { calculateStandings, StandingRow } from '@/lib/standings';
import { Calendar, Trophy, Users, Shield, Clock, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import MatchDetailModal from '@/components/public/MatchDetailModal';

interface Props {
  tournament: any;
  teams: any[];
  matches: any[];
  players: any[];
}

export default function TournamentViewClient({ tournament, teams, matches, players }: Props) {
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'results' | 'teams'>('standings');
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedTeam || selectedMatch) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTeam, selectedMatch]);

  // 1. Calculate Standings
  const standings = calculateStandings(
    teams,
    matches,
    tournament.points_win ?? 3,
    tournament.points_draw ?? 1,
    tournament.points_loss ?? 0
  );

  const isGroupFormat = tournament.format === 'League + Knockout' || tournament.format === 'Group + Knockout' || tournament.format === 'league_knockout';

  // Group standings if needed
  const groupedStandings: Record<string, StandingRow[]> = {};
  if (isGroupFormat) {
    standings.forEach((row) => {
      const grp = row.group_name || 'Group stage';
      if (!groupedStandings[grp]) groupedStandings[grp] = [];
      groupedStandings[grp].push(row);
    });
  }

  // 2. Filter Matches
  const scheduledMatches = matches.filter(
    (m) => m.status?.toLowerCase() === 'scheduled' || m.status?.toLowerCase() === 'live'
  );
  const completedMatches = matches.filter(
    (m) => m.status?.toLowerCase() === 'completed' || m.status?.toLowerCase() === 'live'
  );

  // 3. Compute Top 5 Scorers
  const topScorers = [...players]
    .filter((p) => p.goals_scored > 0)
    .sort((a, b) => b.goals_scored - a.goals_scored)
    .slice(0, 5);

  // Helper for initials
  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getTeamName = (teamId: string) => {
    return teams.find((t) => t.id === teamId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-10 pb-16">
      {/* ═══════ Multi-Tab Menu Navigation ═══════ */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-around overflow-x-auto scrollbar-hide py-2">
          {(
            [
              { id: 'standings', label: 'Standings', icon: Trophy },
              { id: 'fixtures', label: 'Fixtures', icon: Calendar },
              { id: 'results', label: 'Results', icon: Clock },
              { id: 'teams', label: 'Teams', icon: Users },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all flex-shrink-0 ${
                  active
                    ? 'border-[#00D084] text-[#00D084]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* ═══════ Active Tab Content panel ═══════ */}
        <div>
          {/* STANDINGS TAB */}
          {activeTab === 'standings' && (
            <div className="space-y-6">
              {isGroupFormat ? (
                Object.keys(groupedStandings).length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                    No standings calculated yet.
                  </div>
                ) : (
                  Object.entries(groupedStandings).map(([groupName, rows]) => (
                    <div key={groupName} className="space-y-3">
                      <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                        {groupName}
                      </h3>
                      {renderTable(rows, getTeamInitials)}
                    </div>
                  ))
                )
              ) : (
                standings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                    No standings calculated yet.
                  </div>
                ) : (
                  renderTable(standings, getTeamInitials)
                )
              )}
            </div>
          )}

          {/* FIXTURES TAB */}
          {activeTab === 'fixtures' && (
            <div className="space-y-4">
              {scheduledMatches.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                  No upcoming fixtures scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {scheduledMatches.map((match) => {
                    const isLive = match.status?.toLowerCase() === 'live';
                    return (
                      <div
                        key={match.id}
                        onClick={() => {
                          if (isLive) setSelectedMatch(match);
                        }}
                        className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${
                          isLive ? 'border-green-300 bg-green-50/10 cursor-pointer hover:border-green-400 hover:shadow-md' : 'border-slate-200'
                        }`}
                      >
                        {/* Kickoff */}
                        <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-1 text-slate-500 text-xs w-full md:w-32 flex-shrink-0">
                          <span className="font-bold text-slate-700 block uppercase tracking-wide">
                            {match.stage || 'League'}
                          </span>
                          <span className="font-mono">
                            {match.match_date
                              ? new Date(match.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                              : 'TBD'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {match.kick_off_time?.slice(0, 5) || '—'}
                          </span>
                        </div>

                        {/* Teams Box */}
                        <div className="flex-1 flex items-center justify-between w-full min-w-0 px-2">
                          <div className="flex-1 flex items-center justify-end gap-3 text-right">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {match.home_team?.name || 'TBD'}
                            </span>
                            <TeamLogo team={match.home_team} initials={getTeamInitials(match.home_team?.name || 'H')} />
                          </div>

                          <div className="mx-6 flex flex-col items-center flex-shrink-0">
                            {isLive ? (
                              <div className="font-mono text-base font-extrabold bg-green-50 border border-green-200 text-green-600 px-3 py-1 rounded-lg">
                                {match.home_score ?? 0} - {match.away_score ?? 0}
                              </div>
                            ) : (
                              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                                VS
                              </span>
                            )}
                            {isLive && (
                              <span className="mt-1 text-[9px] font-extrabold text-white bg-green-500 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>

                          <div className="flex-1 flex items-center justify-start gap-3 text-left">
                            <TeamLogo team={match.away_team} initials={getTeamInitials(match.away_team?.name || 'A')} />
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {match.away_team?.name || 'TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RESULTS TAB */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              {completedMatches.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                  No match results recorded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {completedMatches.map((match) => {
                    const isLive = match.status?.toLowerCase() === 'live';
                    return (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all cursor-pointer hover:border-[#00D084]/40 hover:shadow-md ${
                          isLive ? 'border-green-300 bg-green-50/10 hover:border-green-400' : 'border-slate-200'
                        }`}
                      >
                        {/* Kickoff */}
                        <div className="flex md:flex-col items-center md:items-start gap-2 md:gap-1 text-slate-500 text-xs w-full md:w-32 flex-shrink-0">
                          <span className="font-bold text-slate-700 block uppercase tracking-wide">
                            {match.stage || 'League'}
                          </span>
                          <span className="font-mono">
                            {match.match_date
                              ? new Date(match.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                              : 'TBD'}
                          </span>
                        </div>

                        {/* Scores Box */}
                        <div className="flex-1 flex items-center justify-between w-full min-w-0 px-2">
                          <div className="flex-1 flex items-center justify-end gap-3 text-right">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {match.home_team?.name || 'TBD'}
                            </span>
                            <TeamLogo team={match.home_team} initials={getTeamInitials(match.home_team?.name || 'H')} />
                          </div>

                          <div className="mx-6 flex flex-col items-center flex-shrink-0">
                            <div className={`font-mono text-base font-extrabold px-3 py-1 rounded-lg border ${
                              isLive ? 'bg-green-50 border-green-200 text-green-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              {match.home_score ?? 0} - {match.away_score ?? 0}
                            </div>
                            {match.home_penalty_score !== null && match.home_penalty_score !== undefined &&
                             match.away_penalty_score !== null && match.away_penalty_score !== undefined && (
                              <span className="mt-1 text-[11px] font-bold text-emerald-600 font-mono">
                                Pen {match.home_penalty_score} - {match.away_penalty_score}
                              </span>
                            )}
                            <span className={`mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                              isLive ? 'text-white bg-green-500 animate-pulse' : 'text-slate-500 bg-slate-100'
                            }`}>
                              {isLive ? 'LIVE' : 'FT'}
                            </span>
                          </div>

                          <div className="flex-1 flex items-center justify-start gap-3 text-left">
                            <TeamLogo team={match.away_team} initials={getTeamInitials(match.away_team?.name || 'A')} />
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {match.away_team?.name || 'TBD'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TEAMS TAB */}
          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {teams.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                  No registered teams found.
                </div>
              ) : (
                teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className="bg-white border border-slate-200 hover:border-[#00D084]/40 rounded-xl p-5 shadow-sm text-left flex items-center justify-between gap-4 group transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamLogo team={team} initials={getTeamInitials(team.name)} />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 group-hover:text-[#00D084] transition-colors block truncate">
                          {team.name}
                        </span>
                        {team.group_name && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold">
                            {team.group_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-[#00D084] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ═══════ Top 5 Scorers Leaderboard ═══════ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Trophy className="h-5 w-5 text-[#00D084]" />
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
              Top 5 Scorers
            </h2>
          </div>

          {topScorers.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              No goals recorded in this tournament yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topScorers.map((player, idx) => (
                <div key={player.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-400 w-5">{idx + 1}</span>
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{player.name}</span>
                      <span className="text-xs text-slate-500">{getTeamName(player.team_id)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-lg text-xs font-extrabold font-mono">
                    {player.goals_scored} Goals
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Team Roster Modal (Read-only) ═══════ */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0A1628] text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TeamLogo team={selectedTeam} initials={getTeamInitials(selectedTeam.name)} />
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedTeam.name}</h3>
                  {selectedTeam.manager_name ? (
                    <p className="text-xs text-slate-300 font-medium">Manager: {selectedTeam.manager_name}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Roster squad details (Read-only)</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-slate-400 hover:text-white transition-colors text-sm font-semibold border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Players
              </div>
              <div className="space-y-2">
                {players.filter((p) => p.team_id === selectedTeam.id).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No players registered on this roster yet.
                  </div>
                ) : (
                  players
                    .filter((p) => p.team_id === selectedTeam.id)
                    .map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 border border-slate-100 hover:bg-slate-50/50 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                            <User size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {player.name}
                            </span>
                            {player.position && (
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                                {player.position}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {player.role === 'captain' && (
                            <span className="text-[9px] bg-amber-100 border border-amber-200 text-amber-800 font-extrabold px-2 py-0.5 rounded">
                              Captain
                            </span>
                          )}
                          {player.role === 'goalkeeper' && (
                            <span className="text-[9px] bg-blue-100 border border-blue-200 text-blue-800 font-extrabold px-2 py-0.5 rounded">
                              GK
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        teams={teams}
        players={players}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}

/* ─── Shared Sub-components ────────────────────────────────────────────── */

function TeamLogo({ team, initials }: { team?: any; initials: string }) {
  return (
    <div className="w-8 h-8 rounded-full border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
      {team?.logo_url ? (
        <img src={team.logo_url} className="w-full h-full object-cover" alt="" />
      ) : (
        <span className="text-[10px] font-bold text-slate-400">{initials}</span>
      )}
    </div>
  );
}

function renderTable(rows: StandingRow[], getTeamInitials: (name: string) => string) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 w-12 text-center">
                #
              </th>
              <th scope="col" className="sticky left-0 bg-slate-50 z-10 px-6 py-3 font-bold text-slate-500 min-w-[200px]">
                Team
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                P
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                W
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                D
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                L
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                GF
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                GA
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-slate-500 text-center w-16">
                GD
              </th>
              <th scope="col" className="px-6 py-3 font-bold text-slate-500 text-center w-20">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const gd = row.gd ?? 0;
              const formattedGd = gd > 0 ? `+${gd}` : gd;
              const gdColor =
                gd > 0 ? 'text-green-600 font-bold' : gd < 0 ? 'text-red-500 font-semibold' : 'text-slate-400';

              return (
                <tr key={row.team_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400">
                    {index + 1}
                  </td>
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 px-6 py-3.5 font-bold text-slate-800">
                    <div className="flex items-center gap-3">
                      <TeamLogo team={{ logo_url: row.logo_url }} initials={getTeamInitials(row.team_name)} />
                      <span className="truncate">{row.team_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-600">{row.played}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{row.won}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{row.drawn}</td>
                  <td className="px-4 py-3.5 text-center text-slate-600">{row.lost}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{row.gf}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{row.ga}</td>
                  <td className={`px-4 py-3.5 text-center ${gdColor}`}>{formattedGd}</td>
                  <td className="px-6 py-3.5 text-center font-mono font-black text-slate-900 bg-slate-50/30">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
