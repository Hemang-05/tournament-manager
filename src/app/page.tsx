import { createClient } from '@supabase/supabase-js';
import TournamentBrowser from '@/components/TournamentBrowser';
import { mapTournamentDbToUi } from '@/lib/tournament';

export const metadata = {
  title: 'Tournaments | TournamentMgr',
  description:
    'Browse and follow local tournaments near you. Find live scores, fixtures, and standings for football, cricket, basketball, pickleball and more.',
};

export const revalidate = 60; // ISR — revalidate every 60s

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(
      `id, name, slug, sport, sport_custom, format, status,
       start_date, end_date, venue_name, max_teams, is_public,
       organiser_id,
       organisers ( name )`
    )
    .eq('is_public', true)
    .order('start_date', { ascending: false });

  // Sort client-side by status priority since Supabase doesn't support CASE in order
  const statusOrder: Record<string, number> = {
    active: 1,
    draft: 2,
    completed: 3,
  };

  const sorted = (tournaments ?? []).sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    // secondary sort: start_date desc (already sorted, but ensure consistency)
    const da = a.start_date ? new Date(a.start_date).getTime() : 0;
    const db = b.start_date ? new Date(b.start_date).getTime() : 0;
    return db - da;
  });

  const formattedTournaments = sorted.map((t: any) => {
    const uiTourney = mapTournamentDbToUi(t);
    return {
      ...uiTourney,
      organisers: Array.isArray(t.organisers) ? (t.organisers[0] || null) : (t.organisers || null),
    };
  });

  return <TournamentBrowser tournaments={formattedTournaments as any} />;
}
