import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament-server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    return <div className="p-8">Please select a tournament first.</div>;
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) {
    return <div className="p-8">Tournament not found.</div>;
  }

  return (
    <div className="p-8">
      <SettingsClient tournament={tournament} />
    </div>
  );
}
