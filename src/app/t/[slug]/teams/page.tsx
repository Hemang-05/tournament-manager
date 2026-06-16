import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teams | TournamentMgr',
  description: 'Browse all registered teams in the tournament.',
};

export default async function TeamsPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerClient();

  // 1. Fetch tournament by slug
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!tournament) {
    notFound();
  }

  // 2. Fetch Teams for this tournament
  const { data: teams } = await supabase
    .from('teams')
    .select('*, players(count)')
    .eq('tournament_id', tournament.id)
    .order('name');

  const allTeams = teams || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1
        className="text-4xl font-black text-gray-900 mb-2 tracking-tight"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Teams
      </h1>
      <p className="text-[#64748B] mb-10 text-lg font-medium">
        All registered teams competing in {tournament.name}
      </p>

      {allTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-[#0F172A]">No teams registered yet</h3>
          <p className="mt-1 max-w-xs text-sm text-[#64748B]">
            Teams will appear here once they have been added to the tournament.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTeams.map((team) => {
            const playerCount = (team.players as any)?.[0]?.count || 0;

            return (
              <div
                key={team.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg hover:border-[#00D084]/30 transition-all group"
              >
                <div className="p-8 flex flex-col items-center text-center">
                  {/* Logo */}
                  <div className="w-24 h-24 bg-gray-50 rounded-2xl mb-5 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-[#00D084]/40 transition-colors">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-black text-gray-300">
                        {team.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h2 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#00D084] transition-colors">
                    {team.name}
                  </h2>

                  {/* Manager */}
                  <p className="text-sm text-[#64748B] font-medium mb-4">
                    {team.manager_name || 'No manager assigned'}
                  </p>

                  {/* Player count badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-600 mb-6">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {playerCount} {playerCount === 1 ? 'Player' : 'Players'}
                  </span>

                  {/* CTA */}
                  <Link
                    href={`/t/${tournament.slug}/teams/${team.id}`}
                    className="w-full bg-[#0A1628] hover:bg-[#0d1e38] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 group-hover:bg-[#00D084] group-hover:shadow-sm"
                  >
                    View Squad
                    <svg
                      className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
