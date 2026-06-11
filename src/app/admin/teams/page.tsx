import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import TeamsClient from './TeamsClient';

export default async function TeamsPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    return <div className="p-8">Please select a tournament first.</div>;
  }

  // Fetch teams with player count
  const { data: teams } = await supabase
    .from('teams')
    .select('*, players(count)')
    .eq('tournament_id', tournamentId)
    .order('name');

  // Fetch players_per_team setting and max_teams
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('players_per_team, slug, max_teams')
    .eq('id', tournamentId)
    .single();

  const playersPerTeam = tournament?.players_per_team || 8;
  const tournamentSlug = tournament?.slug || '';
  const maxTeams = tournament?.max_teams || 8;

  return (
    <div className="p-8">
      <TeamsClient 
        initialTeams={teams || []} 
        tournamentId={tournamentId} 
        playersPerTeam={playersPerTeam} 
        tournamentSlug={tournamentSlug}
        maxTeams={maxTeams}
      />
    </div>
  );
}
