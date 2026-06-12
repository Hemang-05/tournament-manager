import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ResultsClient from "./ResultsClient";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  manager_name?: string | null;
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

export default async function ResultsPage({
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

  // 2. Fetch Teams, Players, Matches, and Events for this tournament
  let teams: Team[] = [];
  let matches: Match[] = [];
  let players: Player[] = [];

  // Fetch Teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, logo_url, manager_name")
    .eq("tournament_id", tournament.id);
  
  teams = (teamsData as any) ?? [];

  // Fetch Players for all teams in tournament
  if (teams.length > 0) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, team_id")
      .in("team_id", teams.map((t) => t.id));

    players = playersData ?? [];
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

  return (
    <ResultsClient
      tournament={tournament}
      teams={teams}
      matches={matches}
      players={players}
    />
  );
}
