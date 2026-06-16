import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import FixturesClient from './FixturesClient';
import { redirect } from 'next/navigation';

export default async function FixturesPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    redirect('/admin');
  }

  // Fetch tournament details
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8">Tournament not found</div>;

  // Fetch teams count
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  // Fetch existing matches
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id (id, name),
      away_team:away_team_id (id, name)
    `)
    .eq('tournament_id', tournamentId)
    .order('match_date', { ascending: true })
    .order('kick_off_time', { ascending: true });

  // Fetch all teams for manual adding/editing
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, group_name')
    .eq('tournament_id', tournamentId)
    .order('name');

  return (
    <div className="p-8">
      <FixturesClient 
        tournament={tournament}
        teamsCount={teamsCount || 0}
        initialMatches={matches || []}
        teams={teams || []}
      />
    </div>
  );
}
