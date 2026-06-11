import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import RegisterClient from './RegisterClient';

export const dynamic = 'force-dynamic';

export default async function PublicTeamRegisterPage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch tournament with organisers relation
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select(`
      id, 
      name, 
      players_per_team, 
      max_teams,
      organisers ( name )
    `)
    .eq('slug', params.slug)
    .single();

  if (tErr || !tournament) {
    notFound();
  }

  // Fetch current registered teams count
  const { count } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id);

  const orgData = Array.isArray(tournament.organisers) ? tournament.organisers[0] : tournament.organisers;
  const organiserName = orgData?.name || '';

  return (
    <RegisterClient 
      tournament={tournament} 
      organiserName={organiserName} 
      initialTeamsCount={count || 0} 
      slug={params.slug}
    />
  );
}
