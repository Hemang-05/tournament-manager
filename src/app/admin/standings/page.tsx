import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament';
import { redirect } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { calculateStandings, StandingRow } from '@/lib/standings';

export default async function AdminStandingsPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) redirect('/admin');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, format, points_win, points_draw, points_loss')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8">Tournament not found</div>;

  // Fetch teams and matches
  const { data: fetchedTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId);

  const { data: fetchedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId);

  const teams = fetchedTeams || [];
  const standings = calculateStandings(
    teams,
    fetchedMatches || [],
    tournament.points_win ?? 2,
    tournament.points_draw ?? 1,
    tournament.points_loss ?? 0
  );

  const isGroupFormat = tournament.format === 'league_knockout';

  // Group standings if needed
  const groupedStandings: Record<string, StandingRow[]> = {};
  if (isGroupFormat) {
    standings.forEach(row => {
      const grp = row.group_name || 'Unassigned';
      if (!groupedStandings[grp]) groupedStandings[grp] = [];
      groupedStandings[grp].push(row);
    });
  }

  // Helper to generate unique team dot colors
  const getTeamColor = (name: string) => {
    const colors = [
      '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
      '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderTable = (rows: StandingRow[], title?: string) => {
    if (rows.length === 0) return null;
    return (
      <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {title && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              {title}
            </h3>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3.5 font-semibold text-gray-500 w-12 text-center">#</th>
                <th className="px-6 py-3.5 font-semibold text-gray-500 min-w-[200px]">Team</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">P</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">W</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">D</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">L</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">GF</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">GA</th>
                <th className="px-4 py-3.5 font-semibold text-gray-500 text-center w-16">GD</th>
                <th className="px-6 py-3.5 font-semibold text-gray-500 text-center w-20">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => {
                const gd = row.gd ?? 0;
                const formattedGd = gd > 0 ? `+${gd}` : gd;
                const gdColor = gd > 0 ? 'text-[#00D084] font-bold' : gd < 0 ? 'text-red-500' : 'text-gray-500';

                return (
                  <tr key={row.team_id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-4 font-mono font-bold text-center text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: getTeamColor(row.team_name) }}
                        />
                        <span className="truncate">{row.team_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-center text-gray-900">{row.played}</td>
                    <td className="px-4 py-4 font-mono text-center text-gray-600">{row.won}</td>
                    <td className="px-4 py-4 font-mono text-center text-gray-600">{row.drawn}</td>
                    <td className="px-4 py-4 font-mono text-center text-gray-600">{row.lost}</td>
                    <td className="px-4 py-4 font-mono text-center text-gray-500">{row.gf}</td>
                    <td className="px-4 py-4 font-mono text-center text-gray-500">{row.ga}</td>
                    <td className={`px-4 py-4 font-mono text-center ${gdColor}`}>{formattedGd}</td>
                    <td className="px-6 py-4 font-mono text-center font-extrabold text-base text-gray-900">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1
          className="text-2xl font-bold text-gray-900 flex items-center gap-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <Trophy size={24} className="text-[#00D084]" />
          Standings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Live league table for {tournament.name}
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Trophy size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            No teams registered
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            The standings table will populate once teams are registered and matches are played.
          </p>
        </div>
      ) : isGroupFormat ? (
        Object.keys(groupedStandings).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No group standings calculated yet.</div>
        ) : (
          Object.keys(groupedStandings)
            .sort()
            .map(groupName => renderTable(groupedStandings[groupName], groupName))
        )
      ) : (
        renderTable(standings)
      )}
    </div>
  );
}
