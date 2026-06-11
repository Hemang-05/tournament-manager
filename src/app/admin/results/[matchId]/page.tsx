import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import { redirect } from 'next/navigation';
import ResultsClient from './ResultsClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MatchResultPage({ params }: { params: { matchId: string } }) {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) redirect('/admin');

  // Fetch match
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('id', params.matchId)
    .eq('tournament_id', tournamentId)
    .single();

  if (!match) return <div className="p-8">Match not found</div>;

  // Fetch match events
  const { data: events } = await supabase
    .from('match_events')
    .select(`
      *,
      player:player_id (name)
    `)
    .eq('match_id', params.matchId)
    .order('minute', { ascending: true });

  // Fetch all players for both teams
  const { data: players } = await supabase
    .from('players')
    .select('id, name, team_id, role')
    .in('team_id', [match.home_team_id, match.away_team_id])
    .order('name');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/admin/fixtures" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ArrowLeft size={16} /> Back to Fixtures
      </Link>
      
      <ResultsClient 
        initialMatch={match}
        initialEvents={events || []}
        players={players || []}
      />
    </div>
  );
}
