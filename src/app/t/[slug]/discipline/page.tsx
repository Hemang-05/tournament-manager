'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

export default function DisciplinePage({
  params,
}: {
  params: { slug: string };
}) {
  const [activeTab, setActiveTab] = useState<'yellow' | 'red'>('yellow');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchDiscipline() {
      setLoading(true);
      try {
        // 1. Fetch tournament by slug
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('id')
          .eq('slug', params.slug)
          .single();

        if (!tournament) {
          setData([]);
          return;
        }

        // 2. Fetch Teams for this tournament
        const { data: teams } = await supabase
          .from('teams')
          .select('id')
          .eq('tournament_id', tournament.id);

        const teamIds = teams?.map(t => t.id) || [];

        if (teamIds.length === 0) {
          setData([]);
          return;
        }

        // 3. Fetch Players from tournament teams
        let playersQuery = supabase
          .from('players')
          .select('id, name, yellow_cards, red_cards, photo_url, team:team_id (name)')
          .in('team_id', teamIds);
          
        if (activeTab === 'yellow') {
          playersQuery = playersQuery.gt('yellow_cards', 0).order('yellow_cards', { ascending: false });
        } else {
          playersQuery = playersQuery.gt('red_cards', 0).order('red_cards', { ascending: false });
        }
        
        const { data: rawPlayers, error: qError } = await playersQuery;
        if (qError) throw qError;
        
        if (rawPlayers) {
          const mapped = rawPlayers.map(p => ({
            player_id: p.id,
            player_name: p.name,
            team_name: (p.team as any)?.name || 'Unknown',
            photo_url: p.photo_url,
            yellow_cards: p.yellow_cards,
            red_cards: p.red_cards
          }));
          setData(mapped);
        }
      } catch (err) {
        console.error("Error fetching discipline info:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDiscipline();
  }, [activeTab, params.slug]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">Discipline</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-8 text-sm text-yellow-800">
        <strong className="font-bold">Rules Note:</strong> A player who accumulates 2 yellow cards in the tournament will receive a 1-match ban. A straight red card results in an automatic 1-match ban, subject to review.
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('yellow')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'yellow' 
              ? 'bg-[#0A1628] text-white shadow-md' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="w-3 h-4 bg-yellow-400 rounded-sm"></div>
          Yellow Cards
        </button>
        <button
          onClick={() => setActiveTab('red')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${
            activeTab === 'red' 
              ? 'bg-[#0A1628] text-white shadow-md' 
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
          Red Cards
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="animate-spin text-[#00D084]" size={32} />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <div className={`w-8 h-12 rounded mb-4 ${activeTab === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'}`}></div>
            <p>No {activeTab} cards recorded yet.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-400 text-sm uppercase w-16 text-center">#</th>
                <th className="px-6 py-4 font-bold text-gray-400 text-sm uppercase">Player</th>
                <th className="px-6 py-4 font-bold text-gray-900 text-sm uppercase text-center w-32">Cards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((player: any, i: number) => {
                const count = activeTab === 'yellow' ? player.yellow_cards : player.red_cards;
                const hasRed = player.red_cards > 0;
                
                return (
                  <tr key={player.player_id} className={`hover:bg-gray-50 transition-colors group ${hasRed && activeTab === 'yellow' ? 'border-l-4 border-l-red-500' : ''}`}>
                    <td className="px-6 py-4 text-center font-medium text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                          {player.photo_url ? (
                            <img src={player.photo_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">
                              {player.player_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-[#00D084] transition-colors">{player.player_name}</div>
                          <div className="text-sm text-gray-500 font-medium">{player.team_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl font-black text-gray-900">{count}</span>
                        <div className={`w-3 h-4 rounded-sm shadow-sm ${activeTab === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
