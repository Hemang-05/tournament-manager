import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { TournamentProvider } from '@/components/TournamentProvider';
import TournamentNavbar from '@/components/layout/TournamentNavbar';
import { mapTournamentDbToUi } from '@/lib/tournament';
import Link from 'next/link';

export default async function TournamentSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch tournament by slug
  const { data: rawTournament, error: tError } = await supabase
    .from('tournaments')
    .select('id, name, slug, sport, format, status')
    .eq('slug', params.slug)
    .single();

  if (tError || !rawTournament) {
    notFound();
  }

  const tournament = mapTournamentDbToUi(rawTournament)!;

  // Fetch CMS pages for this tournament
  const { data: cmsPages } = await supabase
    .from('pages')
    .select('title, slug')
    .eq('tournament_id', tournament.id);

  const pages = cmsPages || [];

  return (
    <TournamentProvider tournament={tournament}>
      <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] antialiased">
        <TournamentNavbar tournament={tournament} cmsPages={pages} />
        <main className="flex-1 w-full">{children}</main>
        <footer className="border-t border-[#E2E8F0] bg-white py-6 mt-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-[#64748B]">
                <span className="font-semibold text-[#0F172A]" style={{ fontFamily: 'Georgia, serif' }}>
                  {tournament.name}
                </span>
                <span>•</span>
                <span>© {new Date().getFullYear()} All rights reserved.</span>
              </div>
              <div className="text-sm text-[#64748B] flex items-center gap-4">
                <Link href="/host" className="font-semibold text-[#00D084] hover:underline">
                  Host Tournament
                </Link>
                <span>Powered by Kickoff</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TournamentProvider>
  );
}
