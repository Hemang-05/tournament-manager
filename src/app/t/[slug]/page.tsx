import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, FileText, HelpCircle } from 'lucide-react';
import { mapTournamentDbToUi, getDisplayStatus } from '@/lib/tournament';
import TournamentViewClient from './TournamentViewClient';

export default async function TournamentOverviewPage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch tournament
  const { data: rawTournament, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !rawTournament) {
    notFound();
  }

  const tournament = mapTournamentDbToUi(rawTournament)!;

  // Fetch teams
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, logo_url, group_name')
    .eq('tournament_id', tournament.id)
    .order('name');

  const teams = teamsData || [];
  const teamIds = teams.map((t) => t.id);

  // Fetch matches
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('tournament_id', tournament.id)
    .order('match_date', { ascending: true })
    .order('kick_off_time', { ascending: true });

  const matches = matchesData || [];

  // Fetch players
  let players: any[] = [];
  if (teamIds.length > 0) {
    const { data: playersData } = await supabase
      .from('players')
      .select('id, name, team_id, position, role, goals_scored')
      .in('team_id', teamIds)
      .order('name');
    players = playersData || [];
  }

  const startDate = tournament.start_date
    ? new Date(tournament.start_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const endDate = tournament.end_date
    ? new Date(tournament.end_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const sportLabel =
    tournament.sport === 'Other' && tournament.sport_custom
      ? tournament.sport_custom
      : tournament.sport || 'Other';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-300">
      {/* Hero Header Card */}
      <div className="bg-[#0A1628] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute -top-1/2 -right-1/4 w-[300px] h-[300px] rounded-full bg-[#00D084]/10 blur-[80px]" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-[#00D084]">
                {sportLabel}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  getDisplayStatus(tournament.status, tournament.start_date) === 'Live'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : getDisplayStatus(tournament.status, tournament.start_date) === 'Completed'
                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {getDisplayStatus(tournament.status, tournament.start_date) === 'Live' ? 'LIVE' : getDisplayStatus(tournament.status, tournament.start_date).toUpperCase()}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {tournament.name}
            </h1>

            <div className="flex flex-wrap gap-y-2 gap-x-6 text-sm text-slate-300">
              {tournament.venue_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-[#00D084]" />
                  <span>{tournament.venue_name}</span>
                </div>
              )}
              {(startDate || endDate) && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-[#00D084]" />
                  <span>
                    {startDate} {endDate ? `– ${endDate}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-row md:flex-col gap-6 md:gap-4 md:w-48 justify-around">
            <div className="text-center md:text-left">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Format</span>
              <span className="text-lg font-bold text-[#00D084]">{tournament.format}</span>
            </div>
            <div className="text-center md:text-left border-l md:border-l-0 md:border-t border-white/10 pl-6 md:pl-0 md:pt-3">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Teams</span>
              <span className="text-lg font-bold text-white">{tournament.max_teams} Teams</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs Menu: Standings, Fixtures, Results, Teams, Top Scorers */}
      <TournamentViewClient
        tournament={tournament}
        teams={teams}
        matches={matches}
        players={players}
      />

      {/* Rules / Description at the bottom */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col min-h-[150px]">
        <h2 className="text-sm font-bold text-[#0A1628] uppercase tracking-wider border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-[#00D084]" /> Rules &amp; Information
        </h2>
        {tournament.rules_content ? (
          <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
            {tournament.rules_content}
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center py-6 text-slate-400">
            <HelpCircle size={32} className="stroke-1 mb-2 text-slate-300" />
            <p className="text-sm">No specific rules have been posted for this tournament yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
