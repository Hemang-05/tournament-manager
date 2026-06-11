import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import PlayersClient from './PlayersClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function TeamPlayersPage({ params }: { params: { teamId: string } }) {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    redirect('/admin');
  }

  // Fetch team details
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', params.teamId)
    .eq('tournament_id', tournamentId)
    .single();

  if (!team) {
    return <div className="p-8">Team not found</div>;
  }

  // Fetch players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', params.teamId)
    .order('name');

  return (
    <div className="p-8">
      <Link href="/admin/teams" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ArrowLeft size={16} /> Back to Teams
      </Link>
      
      <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-gray-400 font-bold text-xl">{team.name.charAt(0)}</div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-500">{team.manager_name || 'No manager'}</p>
        </div>
      </div>

      <PlayersClient initialPlayers={players || []} teamId={team.id} tournamentId={tournamentId} />
    </div>
  );
}
