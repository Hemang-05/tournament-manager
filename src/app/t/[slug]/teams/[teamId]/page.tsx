import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { User, Shield, ChevronLeft } from 'lucide-react';
import { calculateStandings } from '@/lib/standings';

export default async function PublicTeamPage({ 
  params 
}: { 
  params: { slug: string; teamId: string } 
}) {
  const supabase = createServerClient();

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', params.teamId)
    .single();

  if (!team) notFound();

  // Fetch standings for mini stats dynamically
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, points_win, points_draw, points_loss')
    .eq('id', team.tournament_id)
    .single();

  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, logo_url, group_name')
    .eq('tournament_id', team.tournament_id);

  const { data: allMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', team.tournament_id);


  const standingsList = calculateStandings(
    allTeams || [],
    allMatches || [],
    tournament?.points_win ?? 2,
    tournament?.points_draw ?? 1,
    tournament?.points_loss ?? 0
  );

  const standing = standingsList.find((s: any) => s.team_id === params.teamId) || null;

  // Fetch players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', params.teamId)
    .order('role', { ascending: false }) // Captain first
    .order('name');

  // Fetch player stats from match_events
  const { data: events } = await supabase
    .from('match_events')
    .select('player_id, event_type')
    .in('player_id', players?.map(p => p.id) || []);

  const getPlayerStats = (playerId: string) => {
    const pEvents = events?.filter(e => e.player_id === playerId) || [];
    return {
      goals: pEvents.filter(e => e.event_type === 'Goal').length,
      assists: pEvents.filter(e => e.event_type === 'Assist').length,
      yellows: pEvents.filter(e => e.event_type === 'Yellow Card').length,
      reds: pEvents.filter(e => e.event_type === 'Red Card').length,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/t/${params.slug}/teams`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#00D084] hover:text-[#00B871] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Teams
        </Link>
      </div>

      {/* Team Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-12">
        <div className="h-32 bg-[#0A1628] w-full"></div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 mb-6">
            <div className="w-32 h-32 bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center font-bold text-4xl text-gray-400">
                  {team.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{team.name}</h1>
              <p className="text-gray-500 font-medium flex items-center justify-center md:justify-start gap-2">
                <User size={16} /> Manager: {team.manager_name || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-gray-100 pt-8">
            <StatBox label="Played" value={standing?.played || 0} />
            <StatBox label="Won" value={standing?.won || 0} />
            <StatBox label="Drawn" value={standing?.drawn || 0} />
            <StatBox label="Lost" value={standing?.lost || 0} />
            <div className="col-span-2 md:col-span-1 bg-[#00D084]/10 rounded-xl p-4 text-center">
              <div className="text-sm font-medium text-[#00B875] mb-1">Points</div>
              <div className="text-3xl font-black text-[#00D084]">{standing?.points || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Squad */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Shield className="text-[#00D084]" /> Squad
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {players?.map(player => {
          const stats = getPlayerStats(player.id);
          return (
            <div key={player.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6 flex flex-col items-center text-center relative">
                {player.role?.toLowerCase() === 'captain' && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-yellow-400 text-yellow-900 rounded-full font-bold text-xs flex items-center justify-center shadow-sm" title="Captain">
                    C
                  </div>
                )}
                {player.role?.toLowerCase() === 'goalkeeper' && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-[10px] font-bold" title="Goalkeeper">
                    GK
                  </div>
                )}
                
                <div className="w-24 h-24 bg-gray-100 rounded-full mb-4 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm group-hover:border-[#00D084] transition-colors">
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-gray-400" size={32} />
                  )}
                </div>
                
                <h3 className="font-bold text-gray-900 text-lg mb-1">{player.name}</h3>
                <p className="text-sm font-medium text-gray-500 mb-4">{player.position || 'Unknown Position'}</p>
                
                <div className="w-full grid grid-cols-4 gap-2 border-t border-gray-100 pt-4">
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Gls</div>
                    <div className="font-bold text-gray-900">{stats.goals}</div>
                  </div>
                  <div className="text-center border-l border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Ast</div>
                    <div className="font-bold text-gray-900">{stats.assists}</div>
                  </div>
                  <div className="text-center border-l border-gray-100">
                    <div className="text-[10px] text-yellow-500 font-bold uppercase">Yel</div>
                    <div className="font-bold text-gray-900">{stats.yellows}</div>
                  </div>
                  <div className="text-center border-l border-gray-100">
                    <div className="text-[10px] text-red-500 font-bold uppercase">Red</div>
                    <div className="font-bold text-gray-900">{stats.reds}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
