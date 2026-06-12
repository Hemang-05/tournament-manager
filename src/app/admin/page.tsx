import { createServerClient } from '@/lib/supabase-server';
import { getSessionFromCookies } from '@/lib/auth';
import { getDisplayStatus } from '@/lib/tournament';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import Link from 'next/link';
import { Users, CalendarDays, ClipboardList, Wand2, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import SelectTournamentList from '@/components/layout/SelectTournamentList';
import TournamentStatusController from '@/components/layout/TournamentStatusController';
import { calculateStandings, StandingRow } from '@/lib/standings';

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();

  if (!session) redirect('/admin/login');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  
  let displayName = (session.name as string) || 'Organiser';
  if (displayName.includes(' (Contact:')) {
    displayName = displayName
      .split(' | ')
      .map(part => part.split(' (Contact:')[0])
      .join(' & ');
  }

  // Fetch tournaments created by this organiser
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, sport, format, start_date, end_date')
    .eq('organiser_id', session.id as string)
    .order('created_at', { ascending: false });

  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    const hasTournaments = tournaments && tournaments.length > 0;
    return (
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-black text-gray-900 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          {greeting}, {displayName}
        </h1>
        {hasTournaments ? (
          <div>
            <p className="text-gray-600 mb-6 font-medium">Please select one of your active tournaments to manage, or add a new one from the sidebar.</p>
            <SelectTournamentList tournaments={tournaments} />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center py-12">
            <p className="text-gray-600 mb-6 font-medium">You haven&apos;t created a tournament yet. Let&apos;s get started!</p>
            <Link href="/admin/onboarding" className="inline-flex items-center justify-center bg-[#00D084] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#00B871] transition-colors shadow-lg shadow-[#00D084]/20">
              Create a Tournament
            </Link>
          </div>
        )}
      </div>
    );
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8">Tournament not found</div>;

  // Basic stats
  const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
  const { count: matchesCount } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
  const { count: completedMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId).eq('status', 'completed');
  const { count: pendingResults } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId).in('status', ['scheduled', 'live']);

  // Fetch teams and all matches for standings/tiebreakers
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, group_name')
    .eq('tournament_id', tournamentId);

  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId);

  const fetchedTeams = teams || [];
  const fetchedMatches = allMatches || [];

  // Calculate standings
  const standings = calculateStandings(
    fetchedTeams,
    fetchedMatches,
    tournament.points_win ?? 3,
    tournament.points_draw ?? 1,
    tournament.points_loss ?? 0
  );

  // 1. Unresolved Match Draws (requiring match tie-breaker shootout)
  const unresolvedMatchDraws = fetchedMatches.filter(m =>
    m.status?.toLowerCase() === 'completed' &&
    m.stage !== 'Group Tie-breaker' &&
    m.stage !== 'League Tie-breaker' &&
    m.home_score !== null &&
    m.home_score === m.away_score &&
    (m.home_penalty_score === null || m.home_penalty_score === undefined ||
     m.away_penalty_score === null || m.away_penalty_score === undefined)
  );

  // 2. Group Standings Ties (requiring group tie-breaker shootout)
  const groupStandingsTies: { teamA: StandingRow; teamB: StandingRow; groupName: string | null }[] = [];
  
  const standingsByGroup: Record<string, StandingRow[]> = {};
  standings.forEach(row => {
    const grp = row.group_name || 'default';
    if (!standingsByGroup[grp]) standingsByGroup[grp] = [];
    standingsByGroup[grp].push(row);
  });

  Object.entries(standingsByGroup).forEach(([grp, rows]) => {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const teamA = rows[i];
        const teamB = rows[j];
        if (teamA.points === teamB.points && teamA.gd === teamB.gd) {
          const shootoutExists = fetchedMatches.some(m =>
            (m.stage === 'Group Tie-breaker' || m.stage === 'League Tie-breaker') &&
            m.status?.toLowerCase() === 'completed' &&
            ((m.home_team_id === teamA.team_id && m.away_team_id === teamB.team_id) ||
             (m.home_team_id === teamB.team_id && m.away_team_id === teamA.team_id))
          );
          if (!shootoutExists) {
            groupStandingsTies.push({
              teamA,
              teamB,
              groupName: grp === 'default' ? null : grp
            });
          }
        }
      }
    }
  });

  const teamIds = fetchedTeams.map(t => t.id);
  let duplicatePlayers: { name: string; teams: string[] }[] = [];

  if (teamIds.length > 0) {
    const { data: players } = await supabase
      .from('players')
      .select('name, team_id')
      .in('team_id', teamIds);

    if (players) {
      const nameToTeams: Record<string, string[]> = {};
      players.forEach(p => {
        const pName = p.name.trim();
        if (!pName) return;
        const teamObj = teams?.find(t => t.id === p.team_id);
        const teamName = teamObj ? teamObj.name : 'Unknown Team';
        if (!nameToTeams[pName]) {
          nameToTeams[pName] = [];
        }
        if (!nameToTeams[pName].includes(teamName)) {
          nameToTeams[pName].push(teamName);
        }
      });

      duplicatePlayers = Object.entries(nameToTeams)
        .filter(([_, tNames]) => tNames.length > 1)
        .map(([pName, tNames]) => ({ name: pName, teams: tNames }));
    }
  }

  // Upcoming matches
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select(`
      id,
      match_date,
      status,
      home_team:home_team_id (name),
      away_team:away_team_id (name)
    `)
    .eq('tournament_id', tournamentId)
    .in('status', ['scheduled', 'live'])
    .order('match_date', { ascending: true })
    .limit(3);

  const displayStatus = getDisplayStatus(tournament.status, tournament.start_date);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{greeting}, {displayName}</h1>
          <div className="flex items-center gap-3">
            <h2 className="text-xl text-gray-600">{tournament.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              displayStatus === 'Live' ? 'bg-green-100 text-green-800' :
              displayStatus === 'Completed' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {displayStatus}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm">
          <span className="text-xs font-bold text-gray-500">Tournament Status:</span>
          <TournamentStatusController tournamentId={tournament.id} initialStatus={tournament.status} />
        </div>
      </div>

      {/* Important Note: Duplicate Players Alert */}
      {duplicatePlayers.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Note: Matching Player Names Identified</h3>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            The same player name is registered in more than one team. They might be different players, but please double check to confirm eligibility:
          </p>
          <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside bg-white/50 p-3 rounded-lg border border-amber-200/50">
            {duplicatePlayers.map((player, idx) => (
              <li key={idx} className="font-medium">
                Matching name <span className="font-bold text-amber-950">&quot;{player.name}&quot;</span> found in: <span className="italic font-semibold">{player.teams.join(' and ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Unresolved Match Draws Alert */}
      {unresolvedMatchDraws.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-red-600 flex-shrink-0 animate-bounce" />
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">Action Required: Match Draw Tie-breaker Shootout</h3>
          </div>
          <p className="text-xs text-red-700 leading-relaxed">
            The following matches ended in a draw. Every match must be resolved. Please log penalty shootouts for these matches:
          </p>
          <div className="space-y-2">
            {unresolvedMatchDraws.map((match) => {
              const homeTeam = fetchedTeams.find(t => t.id === match.home_team_id);
              const awayTeam = fetchedTeams.find(t => t.id === match.away_team_id);
              return (
                <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3.5 rounded-xl border border-red-200/50">
                  <span className="text-xs font-semibold text-red-900">
                    <span className="font-bold">{homeTeam?.name || 'Home Team'}</span> {match.home_score} - {match.away_score} <span className="font-bold">{awayTeam?.name || 'Away Team'}</span>
                    <span className="text-slate-500 font-medium ml-2">({match.stage})</span>
                  </span>
                  <Link
                    href={`/admin/penalties?matchId=${match.id}`}
                    className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    Go to Penalties
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Unresolved Standings Ties Alert */}
      {groupStandingsTies.length > 0 && unresolvedMatchDraws.length === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 flex-shrink-0 animate-bounce" />
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Action Required: Standings Tie-breaker penalties</h3>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Standings are tied in points and goal difference. Please conduct a penalty shootout between the following teams to resolve the final qualification/ranking order:
          </p>
          <div className="space-y-2">
            {groupStandingsTies.map((tie, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3.5 rounded-xl border border-amber-200/50">
                <span className="text-xs font-semibold text-amber-900">
                  <span className="font-bold">{tie.teamA.team_name}</span> vs <span className="font-bold">{tie.teamB.team_name}</span>
                  {tie.groupName && tie.groupName !== 'default' && ` (in ${tie.groupName})`}
                </span>
                <Link
                  href={`/admin/penalties?teamA=${tie.teamA.team_id}&teamB=${tie.teamB.team_id}`}
                  className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  Go to Penalties
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Teams" value={`${teamsCount || 0} / ${tournament.max_teams}`} icon={Users} />
        <StatCard title="Matches Played" value={`${completedMatches || 0} / ${matchesCount || 0}`} icon={CalendarDays} />
        <StatCard title="Upcoming (3 Days)" value="0" icon={CalendarDays} />
        <StatCard title="Pending Results" value={`${pendingResults || 0}`} icon={ClipboardList} />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/admin/teams" title="Add Team" icon={Users} color="bg-blue-50 text-blue-600" />
          <QuickAction href="/admin/fixtures" title="Generate Fixtures" icon={Wand2} color="bg-purple-50 text-purple-600" />
          <QuickAction href="/admin/results" title="Log Result" icon={ClipboardList} color="bg-green-50 text-green-600" />
          <QuickAction href="/admin/results" title="AI Match Report" icon={Wand2} color="bg-orange-50 text-orange-600" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Upcoming Fixtures</h3>
          <Link href="/admin/fixtures" className="text-sm text-[#00D084] font-medium hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingMatches && upcomingMatches.length > 0 ? (
            upcomingMatches.map((match) => (
              <div key={match.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500 w-24">
                    {new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="font-medium text-gray-900 w-48 text-right truncate">{(match.home_team as any)?.name}</div>
                  <div className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500">VS</div>
                  <div className="font-medium text-gray-900 w-48 truncate">{(match.away_team as any)?.name}</div>
                </div>
                <Link href={`/admin/results/${match.id}`} className="text-sm bg-[#0A1628] text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  Log Result
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">No upcoming fixtures found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="text-gray-400" size={24} />
      </div>
    </div>
  );
}

function QuickAction({ href, title, icon: Icon, color }: { href: string, title: string, icon: any, color: string }) {
  return (
    <Link href={href} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <span className="font-medium text-gray-900">{title}</span>
    </Link>
  );
}
