import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import FixturesClient from "./FixturesClient";

export const dynamic = 'force-dynamic';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
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
  venue_name?: string | null;
  match_events?: any[];
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
}

export default async function FixturesPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { filter?: string };
}) {
  const supabase = createServerClient();
  const activeFilter = searchParams.filter || "all";

  // 1. Fetch tournament by slug
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, slug")
    .eq("slug", params.slug)
    .single();

  if (!tournament) {
    notFound();
  }

  // 2. Fetch Teams, Matches (with match events), and Players for this tournament
  let teams: Team[] = [];
  let matches: Match[] = [];
  let players: any[] = [];

  // Fetch Teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, logo_url, manager_name")
    .eq("tournament_id", tournament.id);
  
  teams = (teamsData as any) ?? [];

  // Fetch matches with status scheduled or live, including match events
  const { data: matchesData } = await supabase
    .from("matches")
    .select("*, match_events(*)")
    .eq("tournament_id", tournament.id)
    .in("status", ["scheduled", "live", "postponed"])
    .order("match_date", { ascending: true })
    .order("kick_off_time", { ascending: true });

  matches = (matchesData as Match[]) ?? [];

  // Fetch Players for all teams in tournament
  if (teams.length > 0) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, team_id")
      .in("team_id", teams.map((t) => t.id));
    players = playersData ?? [];
  }

  // 3. Apply Filters in-memory
  let filteredMatches = matches;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activeFilter === "this-week") {
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    filteredMatches = matches.filter((m) => {
      const matchDate = new Date(m.match_date);
      return matchDate >= today && matchDate <= nextWeek;
    });
  } else if (activeFilter === "league") {
    filteredMatches = matches.filter((m) => m.stage?.toLowerCase() === "league");
  } else if (activeFilter === "knockout") {
    filteredMatches = matches.filter((m) => m.stage?.toLowerCase() !== "league");
  }

  return (
    <FixturesClient
      tournament={tournament}
      teams={teams}
      matches={filteredMatches}
      players={players}
      activeFilter={activeFilter}
    />
  );
}
