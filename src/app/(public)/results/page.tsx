import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Calendar } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
}

interface MatchEvent {
  id: string;
  match_id: string;
  player_id: string;
  type: string;
  minute: number;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  matchday: number | null;
  match_date: string;
  kick_off_time: string | null;
  status: string;
  motm_player_id: string | null;
  match_events: MatchEvent[];
}

export default async function ResultsPage() {
  const supabase = createServerClient();

  // 1. Fetch active tournament
  const { data: activeTournaments } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("status", "active")
    .limit(1);

  let tournament = activeTournaments?.[0] ?? null;

  if (!tournament) {
    const { data: fallbackTournaments } = await supabase
      .from("tournaments")
      .select("id, name")
      .limit(1);
    tournament = fallbackTournaments?.[0] ?? null;
  }

  // 2. Fetch Teams, Players, Matches, and Events
  let teams: Team[] = [];
  let matches: Match[] = [];
  const teamsMap = new Map<string, Team>();
  const playersMap = new Map<string, Player>();

  if (tournament) {
    // Fetch Teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", tournament.id);
    
    teams = teamsData ?? [];
    teams.forEach((t) => teamsMap.set(t.id, t));

    // Fetch Players for all teams in tournament
    if (teams.length > 0) {
      const { data: playersData } = await supabase
        .from("players")
        .select("id, name, team_id")
        .in("team_id", teams.map((t) => t.id));

      const players = playersData ?? [];
      players.forEach((p) => playersMap.set(p.id, p));
    }

    // Fetch completed matches with match events joined
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*, match_events(*)")
      .eq("tournament_id", tournament.id)
      .eq("status", "completed")
      .order("match_date", { ascending: false })
      .order("kick_off_time", { ascending: false });

    matches = (matchesData as Match[]) ?? [];
  }

  // Group matches by matchday, most recent first
  const groupedByMatchday: Record<string, Match[]> = {};
  matches.forEach((match) => {
    let groupKey = "General Results";
    if (match.stage?.toLowerCase() !== "league") {
      groupKey = match.stage || "Knockout Stage";
    } else if (match.matchday) {
      groupKey = `Matchday ${match.matchday}`;
    }
    if (!groupedByMatchday[groupKey]) {
      groupedByMatchday[groupKey] = [];
    }
    groupedByMatchday[groupKey].push(match);
  });

  // Sort groups: Knockout first or Matchdays in desc order
  const sortedGroupKeys = Object.keys(groupedByMatchday).sort((a, b) => {
    const aNum = parseInt(a.replace(/^\D+/g, ""), 10);
    const bNum = parseInt(b.replace(/^\D+/g, ""), 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return bNum - aNum; // Descending order for matchdays
    }
    return b.localeCompare(a);
  });

  // Helper to get initials
  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to get scorers text for a specific team in a match
  const getScorersText = (match: Match, teamId: string) => {
    if (!match.match_events) return "";

    const scorers = match.match_events
      .filter((event) => {
        const type = event.type?.toLowerCase();
        const isGoal = type === "goal" || type === "own_goal";
        if (!isGoal) return false;

        const player = playersMap.get(event.player_id);
        if (!player) return false;

        // If it's a regular goal, player must belong to the target team.
        // If it's an own goal, player must belong to the opposing team (which scores for target team).
        if (type === "goal") {
          return player.team_id === teamId;
        } else {
          return player.team_id !== teamId;
        }
      })
      .map((event) => {
        const player = playersMap.get(event.player_id);
        const name = player ? player.name.split(" ")[0] : "Unknown";
        const isOwnGoal = event.type?.toLowerCase() === "own_goal";
        return `${name} ${event.minute}'${isOwnGoal ? " (OG)" : ""}`;
      });

    return scorers.join(", ");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 border-b border-[#E2E8F0] pb-6">
        <h1
          className="text-3xl font-extrabold text-[#0F172A] sm:text-4xl"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Results
        </h1>
        <p className="mt-2 text-sm text-[#64748B] font-medium">
          Match results for {tournament ? tournament.name : "Kickoff Premier League"}
        </p>
      </div>

      {/* Results Listing */}
      {!tournament || matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-24 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#00D084]/10 text-[#00D084]">
            <Trophy className="h-6 w-6" />
          </div>
          <h3
            className="text-lg font-bold text-[#0F172A]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            No results yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[#64748B]">
            Completed matches and match summaries will display here once they have been played.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedGroupKeys.map((groupKey) => {
            const groupMatches = groupedByMatchday[groupKey];
            return (
              <div key={groupKey} className="space-y-4">
                {/* Matchday Header */}
                <h2
                  className="text-xl font-bold text-[#0A1628] border-b border-[#E2E8F0] pb-2 uppercase tracking-wide text-sm"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {groupKey}
                </h2>

                <div className="grid grid-cols-1 gap-6">
                  {groupMatches.map((match) => {
                    const homeTeam = teamsMap.get(match.home_team_id);
                    const awayTeam = teamsMap.get(match.away_team_id);
                    const motmPlayer = match.motm_player_id ? playersMap.get(match.motm_player_id) : null;

                    const homeScorers = getScorersText(match, match.home_team_id);
                    const awayScorers = getScorersText(match, match.away_team_id);

                    return (
                      <div
                        key={match.id}
                        className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4">
                          
                          {/* Match Core Grid */}
                          <div className="flex items-center justify-between">
                            
                            {/* Home Team */}
                            <div className="flex flex-1 flex-col items-end gap-2 text-right min-w-0">
                              <div className="flex items-center gap-3 w-full justify-end">
                                <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                                  {homeTeam?.name || "Home Team"}
                                </span>
                                <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || "H")} />
                              </div>
                              {homeScorers && (
                                <span className="text-xs text-[#64748B] font-medium max-w-[200px] sm:max-w-xs truncate">
                                  {homeScorers}
                                </span>
                              )}
                            </div>

                            {/* Scoreline */}
                            <div className="mx-4 sm:mx-8 flex flex-col items-center justify-center flex-shrink-0">
                              <div className="font-mono text-xl sm:text-2xl font-black bg-[#0A1628] text-[#00D084] px-4 py-2 rounded-xl leading-none tracking-wider shadow-inner">
                                {match.home_score} - {match.away_score}
                              </div>
                              <span className="mt-2 text-[10px] font-bold text-[#64748B] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                FT
                              </span>
                            </div>

                            {/* Away Team */}
                            <div className="flex flex-1 flex-col items-start gap-2 text-left min-w-0">
                              <div className="flex items-center gap-3 w-full justify-start">
                                <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || "A")} />
                                <span className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                                  {awayTeam?.name || "Away Team"}
                                </span>
                              </div>
                              {awayScorers && (
                                <span className="text-xs text-[#64748B] font-medium max-w-[200px] sm:max-w-xs truncate">
                                  {awayScorers}
                                </span>
                              )}
                            </div>

                          </div>

                          {/* Footer Details Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#E2E8F0] pt-4 mt-1 text-xs">
                            
                            {/* Date & MOTM */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1 text-[#64748B] font-medium">
                                <Calendar className="h-3.5 w-3.5 text-[#00D084]" />
                                <span>{formatDate(match.match_date)}</span>
                              </div>
                              
                              {motmPlayer && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-[#FFD166]/10 border border-[#FFD166]/30 px-2 py-0.5 font-bold text-[#D97706]">
                                  🏆 MoTM: {motmPlayer.name}
                                </span>
                              )}
                            </div>

                            {/* Match Details Link */}
                            <Link
                              href={`/results/${match.id}`}
                              className="inline-flex items-center justify-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#00D084] hover:text-white px-4 py-2 font-bold text-[#0F172A] transition-colors"
                            >
                              Match Details
                            </Link>

                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function TeamLogo({ 
  team, 
  fallbackText 
}: { 
  team?: Team; 
  fallbackText: string 
}) {
  return (
    <div className="relative flex-shrink-0">
      {team?.logo_url ? (
        <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#E2E8F0]">
          <Image
            src={team.logo_url}
            alt={`${team.name} logo`}
            fill
            className="object-cover"
            sizes="32px"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1628] text-xs font-bold text-[#00D084]">
          {fallbackText}
        </div>
      )}
    </div>
  );
}
