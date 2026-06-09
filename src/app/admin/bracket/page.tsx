import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament';
import { redirect } from 'next/navigation';
import BracketClient from './BracketClient';
import { resolveGroupPlayoffs } from '@/lib/bracket';

export default async function AdminBracketPage() {
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

  // Resolve group playoffs automatically if completed
  await resolveGroupPlayoffs(supabase, tournamentId);

  // Fetch all matches for the tournament
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('tournament_id', tournamentId)
    .order('match_date', { ascending: true })
    .order('kick_off_time', { ascending: true });

  // Filter knockout matches
  const knockoutMatches = (matches || []).filter((m: any) => {
    if (!m.stage) return false;
    const stageLower = m.stage.toLowerCase();
    return (
      stageLower.startsWith('quarter') ||
      stageLower.startsWith('semi') ||
      stageLower === 'final' ||
      stageLower.startsWith('round of 16')
    );
  });

  // Fetch all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('tournament_id', tournamentId)
    .order('name');

  return (
    <div className="p-8">
      <BracketClient
        tournament={tournament}
        initialKnockoutMatches={knockoutMatches}
        teams={teams || []}
      />
    </div>
  );
}
