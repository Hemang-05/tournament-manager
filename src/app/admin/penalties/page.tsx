import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import { redirect } from 'next/navigation';
import PenaltiesClient from './PenaltiesClient';

export default async function AdminPenaltiesPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) redirect('/admin');

  // Fetch tournament info
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, format, points_win, points_draw, points_loss')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return <div className="p-8">Tournament not found</div>;
  }

  // Fetch teams in this tournament
  const { data: fetchedTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('name');

  const teams = fetchedTeams || [];
  const teamIds = teams.map((t) => t.id);

  // Fetch players for these teams
  let players: any[] = [];
  if (teamIds.length > 0) {
    const { data: fetchedPlayers } = await supabase
      .from('players')
      .select('id, name, team_id, role')
      .in('team_id', teamIds)
      .order('name');
    players = fetchedPlayers || [];
  }

  // Fetch completed regular matches for match tie-breakers
  const { data: fetchedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId);

  const matches = fetchedMatches || [];

  return (
    <PenaltiesClient
      tournament={tournament}
      teams={teams}
      players={players}
      matches={matches}
    />
  );
}
