import { createServerClient } from '@/lib/supabase-server';
import { getSessionFromCookies } from '@/lib/auth';
import TournamentSwitcherClient from './TournamentSwitcherClient';
import { getSelectedTournamentId } from '@/lib/tournament';

export default async function TournamentSwitcher() {
  const session = await getSessionFromCookies();

  if (!session?.id) {
    return null;
  }

  const supabase = createServerClient();

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('organiser_id', session.id as string);

  const selectedId = getSelectedTournamentId();

  return (
    <div className="w-full">
      <TournamentSwitcherClient tournaments={tournaments || []} selectedId={selectedId} />
    </div>
  );
}
