import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import Image from "next/image";
import { 
  Calendar, 
  MapPin, 
  Trophy, 
  Users, 
  Activity, 
  Flame, 
  ChevronRight, 
  Clock 
} from "lucide-react";

// Types
interface Tournament {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
}

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
  status: string;
  match_date: string;
  kick_off_time: string | null;
}

interface TopScorer {
  player_name: string;
  goals: number;
  team_name: string;
}

export default async function PublicTournamentPage() {
  const supabase = createServerClient();

  // 1. Fetch active tournament
  const { data: activeTournaments } = await supabase
    .from("tournaments")
    .select("*")
    .eq("status", "active")
    .limit(1);

  let tournament: Tournament;
  let isPlaceholder = false;

  if (activeTournaments && activeTournaments.length > 0) {
    tournament = activeTournaments[0];
  } else {
    // Fallback to first tournament in the database
    const { data: fallbackTournaments } = await supabase
      .from("tournaments")
      .select("*")
      .limit(1);

    if (fallbackTournaments && fallbackTournaments.length > 0) {
      tournament = fallbackTournaments[0];
    } else {
      // Use placeholder mockup data if DB is completely empty
      tournament = {
        id: "placeholder",
        name: "Kickoff Premier League",
        status: "active",
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        venue_name: "Kickoff Arena",
      };
      isPlaceholder = true;
    }
  }

  // 2. Fetch associated data if we have a tournament
  let teams: Team[] = [];
  let completedMatchesCount = 0;
  let goalsScored = 0;
  let topScorer: TopScorer | null = null;
  let latestResults: Match[] = [];
  let nextFixtures: Match[] = [];

  const teamsMap = new Map<string, Team>();

  if (!isPlaceholder) {
    // Fetch Teams
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("tournament_id", tournament.id);
    
    teams = teamsData ?? [];
    teams.forEach((t) => teamsMap.set(t.id, t));

    // Fetch Completed Matches count & Goals
    const { data: completedMatches } = await supabase
      .from("matches")
      .select("home_score, away_score")
      .eq("tournament_id", tournament.id)
      .eq("status", "completed");

    completedMatchesCount = completedMatches?.length || 0;
    goalsScored = completedMatches?.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0) || 0;

    // Fetch Top Scorer
    const { data: topScorers } = await supabase
      .from("top_scorers")
      .select("player_name, goals, team_name")
      .eq("tournament_id", tournament.id)
      .order("goals", { ascending: false })
      .limit(1);

    topScorer = topScorers?.[0] ?? null;

    // Fetch Latest Results (last 3 completed matches)
    const { data: resultsData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("status", "completed")
      .order("match_date", { ascending: false })
      .order("kick_off_time", { ascending: false })
      .limit(3);
    
    latestResults = resultsData ?? [];

    // Fetch Next Fixtures (next 3 scheduled matches)
    const { data: fixturesData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("status", "scheduled")
      .order("match_date", { ascending: true })
      .order("kick_off_time", { ascending: true })
      .limit(3);

    nextFixtures = fixturesData ?? [];
  }

  // Helper to format date ranges
  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return "";
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
    const startDate = new Date(start).toLocaleDateString("en-US", options);
    if (!end) return startDate;
    const endDate = new Date(end).toLocaleDateString("en-US", options);
    return `${startDate} — ${endDate}`;
  };

  // Helper to format match date & time
  const formatMatchDateTime = (dateStr: string, timeStr?: string | null) => {
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!timeStr) return formattedDate;
    const timeParts = timeStr.split(":");
    const formattedTime = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : timeStr;
    return `${formattedDate} at ${formattedTime}`;
  };

  // Helper for team initials in case of no logo
  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="pb-16">
      {/* 1. HERO SECTION */}
      <section className="bg-[#0A1628] text-white py-16 md:py-24 relative overflow-hidden">
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-6 max-w-3xl">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              {tournament.status === "active" ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD166] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFD166]"></span>
                  </span>
                  <span className="text-[#FFD166] font-bold">LIVE</span>
                </>
              ) : tournament.status === "completed" ? (
                <span className="text-slate-400">Completed</span>
              ) : (
                <span className="text-slate-400">Upcoming</span>
              )}
            </div>

            {/* Tournament Title */}
            <h1 
              className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {tournament.name}
            </h1>

            {/* Meta Details: Dates & Venue */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-slate-300 text-sm md:text-base mt-2">
              {tournament.start_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#00D084]" />
                  <span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
                </div>
              )}
              {tournament.venue_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#00D084]" />
                  <span>{tournament.venue_name}</span>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-6 w-full sm:w-auto">
              <Link
                href="/table"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg bg-[#00D084] px-6 py-3 text-sm font-bold text-[#0A1628] shadow-lg shadow-[#00D084]/20 transition-all hover:bg-[#00B871] hover:shadow-xl hover:shadow-[#00D084]/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                View Table
              </Link>
              <Link
                href="/fixtures"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg border-2 border-[#00D084] px-6 py-[10px] text-sm font-bold text-[#00D084] transition-all hover:bg-[#00D084]/10 hover:scale-[1.02] active:scale-[0.98]"
              >
                See Fixtures
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK STATS ROW */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Teams Registered"
            value={teams.length}
            icon={<Users className="h-5 w-5 text-[#00D084]" />}
          />
          <StatCard
            title="Matches Played"
            value={completedMatchesCount}
            icon={<Activity className="h-5 w-5 text-[#00D084]" />}
          />
          <StatCard
            title="Goals Scored"
            value={goalsScored}
            icon={<Trophy className="h-5 w-5 text-[#00D084]" />}
          />
          <StatCard
            title="Top Scorer"
            value={topScorer ? `${topScorer.player_name}` : "—"}
            subValue={topScorer ? `${topScorer.goals} goals` : undefined}
            icon={<Flame className="h-5 w-5 text-[#FFD166]" />}
            highlight={!!topScorer}
          />
        </div>
      </section>

      {/* 3. LATEST RESULTS & 4. NEXT FIXTURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          
          {/* LATEST RESULTS */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 
                className="text-2xl font-bold text-[#0F172A]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Latest Results
              </h2>
              <Link 
                href="/results" 
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#00D084] hover:text-[#00B871] transition-colors"
              >
                <span>View all results</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {latestResults.length === 0 ? (
              <EmptyState 
                title="No results yet" 
                description="Completed matches will display here once they have been played." 
              />
            ) : (
              <div className="space-y-4">
                {latestResults.map((match) => {
                  const homeTeam = teamsMap.get(match.home_team_id);
                  const awayTeam = teamsMap.get(match.away_team_id);
                  return (
                    <Link
                      key={match.id}
                      href={`/results/${match.id}`}
                      className="block group rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-[#00D084]/40 hover:shadow-md hover:shadow-[#00D084]/5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Match Details */}
                        <div className="flex-1 flex items-center justify-between">
                          {/* Home Team */}
                          <div className="flex flex-1 items-center justify-end gap-3 text-right">
                            <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#00D084] transition-colors line-clamp-1">
                              {homeTeam?.name || "Home Team"}
                            </span>
                            <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || "H")} />
                          </div>

                          {/* Score / Status */}
                          <div className="mx-6 flex flex-col items-center justify-center flex-shrink-0">
                            <div className="font-mono text-xl font-extrabold text-[#0F172A] tracking-wider px-3 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] group-hover:bg-[#00D084]/10 group-hover:border-[#00D084]/20 transition-colors">
                              {match.home_score} - {match.away_score}
                            </div>
                            <span className="mt-1.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                              FT
                            </span>
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-1 items-center justify-start gap-3 text-left">
                            <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || "A")} />
                            <span className="text-sm font-bold text-[#0F172A] group-hover:text-[#00D084] transition-colors line-clamp-1">
                              {awayTeam?.name || "Away Team"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* NEXT FIXTURES */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 
                className="text-2xl font-bold text-[#0F172A]"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Next Fixtures
              </h2>
              <Link 
                href="/fixtures" 
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#00D084] hover:text-[#00B871] transition-colors"
              >
                <span>View all fixtures</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {nextFixtures.length === 0 ? (
              <EmptyState 
                title="No upcoming fixtures" 
                description="There are currently no scheduled fixtures on calendar." 
              />
            ) : (
              <div className="space-y-4">
                {nextFixtures.map((match) => {
                  const homeTeam = teamsMap.get(match.home_team_id);
                  const awayTeam = teamsMap.get(match.away_team_id);
                  return (
                    <div
                      key={match.id}
                      className="rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Teams & Versus */}
                        <div className="flex-1 flex items-center justify-between">
                          {/* Home Team */}
                          <div className="flex flex-1 items-center justify-end gap-3 text-right">
                            <span className="text-sm font-bold text-[#0F172A] line-clamp-1">
                              {homeTeam?.name || "Home Team"}
                            </span>
                            <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || "H")} />
                          </div>

                          {/* VS Marker */}
                          <div className="mx-6 font-mono text-xs font-bold text-[#64748B] uppercase bg-slate-100 rounded px-2.5 py-1 border border-slate-200 flex-shrink-0">
                            VS
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-1 items-center justify-start gap-3 text-left">
                            <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || "A")} />
                            <span className="text-sm font-bold text-[#0F172A] line-clamp-1">
                              {awayTeam?.name || "Away Team"}
                            </span>
                          </div>
                        </div>

                        {/* Date/Time Indicator */}
                        <div className="flex items-center justify-center sm:justify-end gap-1.5 text-xs text-[#64748B] bg-[#F8FAFC] sm:bg-transparent rounded-lg p-2 sm:p-0 border border-[#E2E8F0] sm:border-0 font-medium">
                          <Clock className="h-3.5 w-3.5 text-[#00D084]" />
                          <span className="font-mono">
                            {formatMatchDateTime(match.match_date, match.kick_off_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function StatCard({
  title,
  value,
  subValue,
  icon,
  highlight,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`group rounded-xl border p-5 shadow-sm transition-all ${
      highlight 
        ? "border-[#FFD166]/40 bg-gradient-to-br from-white to-[#FFD166]/5 hover:border-[#FFD166] hover:shadow-md hover:shadow-[#FFD166]/5" 
        : "border-[#E2E8F0] bg-white hover:border-[#00D084]/30 hover:shadow-md hover:shadow-[#00D084]/5"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
          {title}
        </span>
        <div className={`p-2 rounded-lg transition-colors ${
          highlight 
            ? "bg-[#FFD166]/10 group-hover:bg-[#FFD166]/20" 
            : "bg-slate-50 group-hover:bg-[#00D084]/10"
        }`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="font-mono text-2xl font-bold tracking-tight text-[#0F172A]">
          {value}
        </p>
        {subValue && (
          <p className="mt-1 text-xs font-semibold text-[#00D084]">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

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

function EmptyState({ 
  title, 
  description 
}: { 
  title: string; 
  description: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
      <div className="mb-3 rounded-full bg-slate-50 p-3 text-[#64748B]">
        <Calendar className="h-6 w-6 opacity-60" />
      </div>
      <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-1 text-xs text-[#64748B] max-w-xs">{description}</p>
    </div>
  );
}
