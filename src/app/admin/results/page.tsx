import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Radio, CheckCircle2, ChevronRight, Calendar, Trophy } from 'lucide-react';

export default async function AdminResultsPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) redirect('/admin');

  // Fetch tournament details (using venue_name instead of venue)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, venue_name')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8 text-center font-medium text-gray-500">Tournament not found</div>;

  // Fetch all matches with team details
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`
      id,
      match_date,
      kick_off_time,
      status,
      stage,
      matchday,
      home_score,
      away_score,
      home_penalty_score,
      away_penalty_score,
      motm_player:motm_player_id (id, name),
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('tournament_id', tournamentId)
    .order('match_date', { ascending: false })
    .order('kick_off_time', { ascending: false });

  const matches = matchesData || [];

  // Filter to show only matches with results (completed or live)
  const resultsMatches = matches.filter(
    (m) => m.status?.toLowerCase() === 'completed' || m.status?.toLowerCase() === 'live'
  );

  // Helper to get initials
  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <ClipboardList size={24} className="text-[#00D084]" />
            Match Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Results for completed and live matches in <strong>{tournament.name}</strong>.
          </p>
        </div>
        <div>
          <Link
            href="/admin/fixtures"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            Go to Fixtures &amp; Scheduler
          </Link>
        </div>
      </div>

      {resultsMatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Trophy size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            No results logged yet
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Completed or live matches will appear here. Go to the Fixtures page to start a match and begin logging events.
          </p>
          <Link
            href="/admin/fixtures"
            className="inline-flex items-center justify-center bg-[#00D084] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#00B871] transition-colors shadow-lg shadow-[#00D084]/20 text-sm"
          >
            Manage Fixtures
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Matches Played / Live ({resultsMatches.length})
          </div>
          <div className="grid grid-cols-1 gap-4">
            {resultsMatches.map((match: any) => {
              const isLive = match.status?.toLowerCase() === 'live';
              return (
                <Link
                  key={match.id}
                  href={`/admin/results/${match.id}`}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col md:flex-row items-center p-5 gap-4 group"
                >
                  {/* Left: Kickoff Details & Stage */}
                  <div className="flex md:flex-col items-center md:items-start justify-between w-full md:w-32 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4 flex-shrink-0 gap-2">
                    <div>
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide block">
                        {match.stage || 'League'}
                      </span>
                      {match.matchday && match.stage?.toLowerCase() === 'league' && (
                        <span className="text-[10px] text-gray-500 font-medium block">
                          Matchday {match.matchday}
                        </span>
                      )}
                    </div>
                    <div className="text-right md:text-left">
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 font-medium md:mt-1">
                        <Calendar size={12} className="text-gray-400" />
                        {match.match_date
                          ? new Date(match.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                          : 'TBD'}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {match.kick_off_time?.slice(0, 5) || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Center: Teams & Score */}
                  <div className="flex-1 flex flex-col items-center gap-2 w-full min-w-0">
                    <div className="flex items-center justify-between w-full min-w-0 px-2 sm:px-4">
                      {/* Home Team */}
                      <div className="flex-1 flex items-center justify-end gap-3 text-right min-w-0">
                        <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
                          {match.home_team?.name || 'TBD'}
                        </span>
                        <TeamLogo team={match.home_team} initials={getTeamInitials(match.home_team?.name || 'H')} />
                      </div>

                      {/* Scoreline Box */}
                      <div className="mx-4 sm:mx-8 flex flex-col items-center justify-center flex-shrink-0">
                        {isLive ? (
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-lg sm:text-xl font-extrabold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-200 flex items-center gap-1">
                              <span>{match.home_score ?? 0}</span>
                              <span className="text-red-400 font-normal">-</span>
                              <span>{match.away_score ?? 0}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="font-mono text-lg sm:text-xl font-extrabold bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1">
                            <span>{match.home_score ?? 0}</span>
                            <span className="text-gray-400 font-normal">-</span>
                            <span>{match.away_score ?? 0}</span>
                          </div>
                        )}
                        
                        {match.home_penalty_score !== null && match.home_penalty_score !== undefined &&
                         match.away_penalty_score !== null && match.away_penalty_score !== undefined && (
                          <span className="mt-1 text-[10px] font-bold text-emerald-600 font-mono">
                            Pen {match.home_penalty_score} - {match.away_penalty_score}
                          </span>
                        )}

                        {isLive ? (
                          <span className="mt-2 text-[9px] font-extrabold text-white bg-red-500 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="mt-2 text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase tracking-wider">
                            FT
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex items-center justify-start gap-3 text-left min-w-0">
                        <TeamLogo team={match.away_team} initials={getTeamInitials(match.away_team?.name || 'A')} />
                        <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
                          {match.away_team?.name || 'TBD'}
                        </span>
                      </div>
                    </div>

                    {match.motm_player?.name && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        🏆 MOTM: {match.motm_player.name}
                      </span>
                    )}
                  </div>

                  {/* Right: Chevron link trigger */}
                  <div className="flex-shrink-0 hidden md:block pl-2 border-l border-gray-100 self-stretch flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#00D084] group-hover:text-white transition-colors duration-200">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamLogo({ team, initials }: { team?: any; initials: string }) {
  return (
    <div className="w-8 h-8 rounded-full border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-50">
      {team?.logo_url ? (
        <img src={team.logo_url} className="w-full h-full object-cover" alt="" />
      ) : (
        <span className="text-[10px] font-bold text-gray-400">{initials}</span>
      )}
    </div>
  );
}
