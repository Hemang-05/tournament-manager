import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ScorersPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerClient();

  // 1. Fetch tournament by slug
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("slug", params.slug)
    .single();

  if (!tournament) {
    notFound();
  }

  // 2. Fetch Teams for this tournament
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournament.id);

  const teamIds = teams?.map(t => t.id) || [];

  let scorers: any[] = [];
  if (teamIds.length > 0) {
    const { data: topScorers } = await supabase
      .from('players')
      .select('id, name, goals_scored, photo_url, team:team_id (name)')
      .in('team_id', teamIds)
      .gt('goals_scored', 0)
      .order('goals_scored', { ascending: false })
      .limit(20);

    if (topScorers) {
      scorers = topScorers.map(s => ({
        player_id: s.id,
        player_name: s.name,
        team_name: (s.team as any)?.name || 'Unknown',
        photo_url: s.photo_url,
        goals: s.goals_scored,
        assists: 0 // Fetching assists from event table if needed, otherwise 0
      }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">Top Scorers</h1>

      {scorers.length > 0 ? (
        <>
          <div className="bg-gradient-to-br from-[#0A1628] to-[#152A4A] rounded-2xl p-8 mb-12 shadow-xl relative overflow-hidden text-white flex items-center justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00D084] opacity-20 blur-[80px] rounded-full"></div>
            <div className="z-10 flex-1">
              <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                Current Leader
              </div>
              <h2 className="text-3xl sm:text-5xl font-black mb-2">{scorers[0].player_name}</h2>
              <p className="text-xl text-gray-400 font-medium mb-6">{scorers[0].team_name}</p>
              <div className="flex gap-8">
                <div>
                  <div className="text-sm text-gray-400 font-medium">Goals</div>
                  <div className="text-5xl font-black text-[#00D084]">{scorers[0].goals}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 font-medium">Assists</div>
                  <div className="text-5xl font-black text-white">{scorers[0].assists || 0}</div>
                </div>
              </div>
            </div>
            <div className="z-10 hidden sm:block">
              <div className="w-48 h-48 bg-white/10 rounded-full border-4 border-white/20 p-2 overflow-hidden shadow-2xl">
                {scorers[0].photo_url ? (
                  <img src={scorers[0].photo_url} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-4xl font-bold">
                    {scorers[0].player_name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-400 text-sm uppercase w-16 text-center">#</th>
                  <th className="px-6 py-4 font-bold text-gray-400 text-sm uppercase">Player</th>
                  <th className="px-6 py-4 font-bold text-gray-400 text-sm uppercase text-center">Ast</th>
                  <th className="px-6 py-4 font-bold text-gray-900 text-sm uppercase text-center w-24">Goals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scorers.map((scorer: any, i: number) => (
                  <tr key={scorer.player_id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-transparent text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                          {scorer.photo_url ? (
                            <img src={scorer.photo_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">
                              {scorer.player_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#00D084] transition-colors">{scorer.player_name}</div>
                          <div className="text-sm text-gray-500 font-medium">{scorer.team_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-gray-400">
                      {scorer.assists || 0}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-xl font-black text-[#00D084]">{scorer.goals}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          No goals recorded in this tournament yet.
        </div>
      )}
    </div>
  );
}
