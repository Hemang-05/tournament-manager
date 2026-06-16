import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import BracketTree from '@/components/BracketTree';
import { mapTournamentDbToUi } from '@/lib/tournament';

export const dynamic = 'force-dynamic';

export default async function PublicBracketPage({ params }: { params: { slug: string } }) {
  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );

  // Fetch tournament by slug
  const { data: rawTournament } = await supabase
    .from('tournaments')
    .select('id, name, format')
    .eq('slug', params.slug)
    .single();

  if (!rawTournament) notFound();

  const tournament = mapTournamentDbToUi(rawTournament)!;

  // Fetch all matches for the tournament
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('tournament_id', tournament.id)
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 border-b border-[#E2E8F0] pb-6">
        <h1
          className="text-3xl font-extrabold text-[#0F172A] sm:text-4xl"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Playoff Bracket
        </h1>
        <p className="mt-2 text-sm text-[#64748B] font-medium">
          {tournament.name} Playoff Brackets & Knockouts
        </p>
      </div>

      {knockoutMatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-20 text-center shadow-sm">
          <p className="text-gray-500 font-medium">
            No playoff bracket matches scheduled for this tournament yet.
          </p>
        </div>
      ) : (
        <BracketTree matches={knockoutMatches} isAdmin={false} />
      )}
    </div>
  );
}
