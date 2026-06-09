import { createServerClient } from "@/lib/supabase-server";
import { Info } from "lucide-react";
import { calculateStandings, StandingRow } from "@/lib/standings";

export default async function LeagueTablePage() {
  const supabase = createServerClient();

  // 1. Fetch active tournament
  const { data: activeTournaments } = await supabase
    .from("tournaments")
    .select("id, name, format, points_win, points_draw, points_loss")
    .eq("status", "active")
    .limit(1);

  let tournament = activeTournaments?.[0] ?? null;

  if (!tournament) {
    const { data: fallbackTournaments } = await supabase
      .from("tournaments")
      .select("id, name, format, points_win, points_draw, points_loss")
      .limit(1);
    tournament = fallbackTournaments?.[0] ?? null;
  }

  // 2. Fetch teams and matches to calculate standings dynamically
  let standings: StandingRow[] = [];
  let teams: any[] = [];
  if (tournament) {
    const { data: fetchedTeams } = await supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournament.id);

    const { data: fetchedMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id);

    teams = fetchedTeams || [];
    standings = calculateStandings(
      teams,
      fetchedMatches || [],
      tournament.points_win ?? 2,
      tournament.points_draw ?? 1,
      tournament.points_loss ?? 0
    );
  }

  // Helper to generate unique team dot colors
  const getTeamColor = (name: string) => {
    const colors = [
      "#EF4444", // Red
      "#3B82F6", // Blue
      "#10B981", // Green
      "#F59E0B", // Amber
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#06B6D4", // Cyan
      "#14B8A6", // Teal
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const currentTimestamp = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const isGroupFormat = tournament?.format === "league_knockout";

  // Group standings if needed
  const groupedStandings: Record<string, StandingRow[]> = {};
  if (isGroupFormat) {
    standings.forEach(row => {
      const grp = row.group_name || "Unassigned";
      if (!groupedStandings[grp]) groupedStandings[grp] = [];
      groupedStandings[grp].push(row);
    });
  }

  const renderTable = (rows: StandingRow[], title?: string) => {
    if (rows.length === 0) return null;
    return (
      <div className="mb-10 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        {title && (
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-4">
            <h3 className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: "Georgia, serif" }}>
              {title}
            </h3>
          </div>
        )}
        {/* Responsive scrollable table container */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] w-12 text-center">
                  #
                </th>
                <th
                  scope="col"
                  className="sticky left-0 bg-[#F8FAFC] z-10 px-6 py-3.5 font-semibold text-[#64748B] min-w-[200px]"
                >
                  Team
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  P
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  W
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  D
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  L
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  GF
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  GA
                </th>
                <th scope="col" className="px-4 py-3.5 font-semibold text-[#64748B] text-center w-16">
                  GD
                </th>
                <th scope="col" className="px-6 py-3.5 font-semibold text-[#64748B] text-center w-20">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((row, index) => {
                const isQualification = index < 2;
                const isElimination = index === rows.length - 1 && rows.length >= 4;

                const gd = row.gd ?? 0;
                const formattedGd = gd > 0 ? `+${gd}` : gd;
                const gdColor =
                  gd > 0
                    ? "text-[#00D084] font-bold"
                    : gd < 0
                    ? "text-[#EF4444]"
                    : "text-[#64748B]";

                return (
                  <tr
                    key={row.team_id}
                    className={`transition-colors hover:bg-slate-50 ${
                      isQualification
                        ? "border-l-4 border-l-[#00D084]"
                        : isElimination
                        ? "border-l-4 border-l-[#EF4444]"
                        : "border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-4 font-mono font-bold text-center text-[#64748B]">
                      {index + 1}
                    </td>

                    {/* Team name sticky cell */}
                    <td className="sticky left-0 bg-white z-10 px-6 py-4 font-bold text-[#0F172A] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-2.5">
                        {/* Colour Dot */}
                        <span
                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: getTeamColor(row.team_name) }}
                        />
                        <span className="truncate">{row.team_name}</span>
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-4 font-mono text-center text-[#0F172A]">{row.played}</td>
                    <td className="px-4 py-4 font-mono text-center text-slate-600">{row.won}</td>
                    <td className="px-4 py-4 font-mono text-center text-slate-600">{row.drawn}</td>
                    <td className="px-4 py-4 font-mono text-center text-slate-600">{row.lost}</td>
                    <td className="px-4 py-4 font-mono text-center text-slate-500">{row.gf}</td>
                    <td className="px-4 py-4 font-mono text-center text-slate-500">{row.ga}</td>
                    <td className={`px-4 py-4 font-mono text-center ${gdColor}`}>{formattedGd}</td>

                    {/* Points (bold) */}
                    <td className="px-6 py-4 font-mono text-center font-extrabold text-base text-[#0F172A]">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Legend */}
        <div className="flex flex-wrap items-center gap-6 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3.5 text-xs font-semibold text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1 rounded-full bg-[#00D084]" />
            <span>Qualification Zone</span>
          </div>
          {rows.length >= 4 && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-full bg-[#EF4444]" />
              <span>Elimination Zone</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 border-b border-[#E2E8F0] pb-6">
        <h1
          className="text-3xl font-extrabold text-[#0F172A] sm:text-4xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          League Standings
        </h1>
        <p className="mt-2 text-sm text-[#64748B] font-medium">
          {tournament ? tournament.name : "Kickoff Premier League"}
        </p>
      </div>

      {/* Standings Table Card */}
      {!tournament || teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-24 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#00D084]/10 text-[#00D084]">
            <Info className="h-6 w-6" />
          </div>
          <h3
            className="text-lg font-bold text-[#0F172A]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            No teams registered yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[#64748B]">
            The standings table will populate automatically once the teams are registered and matches are played.
          </p>
        </div>
      ) : isGroupFormat ? (
        Object.keys(groupedStandings).length === 0 ? (
          <div className="p-8 text-center text-[#64748B]">No group standings calculated yet.</div>
        ) : (
          Object.keys(groupedStandings)
            .sort()
            .map(groupName => renderTable(groupedStandings[groupName], groupName))
        )
      ) : (
        renderTable(standings)
      )}

      {/* Last Updated Timestamp */}
      {tournament && teams.length > 0 && (
        <div className="mt-4 text-right">
          <p className="text-xs font-semibold text-[#64748B] italic">
            Last updated: {currentTimestamp}
          </p>
        </div>
      )}
    </div>
  );
}
