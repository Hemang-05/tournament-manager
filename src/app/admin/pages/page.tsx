import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament';
import { redirect } from 'next/navigation';
import PagesClient from './PagesClient';

export default async function AdminPagesPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    redirect('/admin');
  }

  // Fetch all CMS pages for this tournament
  const { data: pages } = await supabase
    .from('pages')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('title');

  return (
    <div className="p-8">
      <PagesClient
        tournamentId={tournamentId}
        initialPages={pages || []}
      />
    </div>
  );
}
