import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  ChevronLeft, 
  FileText, 
  Clock,
  Info
} from "lucide-react";

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
  tournament_id: string;
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
  ai_report: string | null;
  venue_name: string | null;
  match_events: MatchEvent[];
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
}

export default async function MatchDetailPage({
  params,
}: {
  params: { slug: string; matchId: string };
}) {
  const supabase = createServerClient();

  // 1. Fetch match details along with its events
  const { data: matchData } = await supabase
    .from("matches")
    .select("*, match_events(*)")
    .eq("id", params.matchId)
    .maybeSingle();

  const match = matchData as Match | null;

  if (!match) {
    notFound();
  }

  // 2. Fetch associated teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, logo_url")
    .in("id", [match.home_team_id, match.away_team_id]);
  
  const teams = teamsData ?? [];
  const homeTeam = teams.find((t) => t.id === match.home_team_id) || null;
  const awayTeam = teams.find((t) => t.id === match.away_team_id) || null;

  const teamsMap = new Map<string, Team>(teams.map((t) => [t.id, t]));

  // 3. Fetch players for these two teams
  let players: Player[] = [];
  if (teams.length > 0) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, name, team_id")
      .in("team_id", teams.map((t) => t.id));
    
    players = playersData ?? [];
  }
  const playersMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  const motmPlayer = match.motm_player_id ? playersMap.get(match.motm_player_id) : null;
  const motmTeam = motmPlayer ? teamsMap.get(motmPlayer.team_id) : null;

  // 4. Sort events by minute ascending
  const sortedEvents = [...(match.match_events || [])].sort((a, b) => a.minute - b.minute);

  // Helper for team initials
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
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper to format time
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
  };

  // Helper for event icon and styling
  const getEventMeta = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "goal") {
      return {
        icon: "⚽",
        label: "Goal",
        bgColor: "bg-green-50 text-green-700 border-green-200",
        pillColor: "bg-green-500",
      };
    }
    if (t === "own_goal") {
      return {
        icon: "⚽",
        label: "Own Goal",
        bgColor: "bg-orange-50 text-orange-700 border-orange-200",
        pillColor: "bg-orange-500",
      };
    }
    if (t === "yellow_card") {
      return {
        icon: "🟨",
        label: "Yellow Card",
        bgColor: "bg-amber-50 text-amber-700 border-amber-200",
        pillColor: "bg-amber-500",
      };
    }
    if (t === "red_card") {
      return {
        icon: "🟥",
        label: "Red Card",
        bgColor: "bg-red-50 text-red-700 border-red-200",
        pillColor: "bg-red-500",
      };
    }
    return {
      icon: "📢",
      label: "Event",
      bgColor: "bg-slate-50 text-slate-700 border-slate-200",
      pillColor: "bg-slate-500",
    };
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/t/${params.slug}/results`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#00D084] hover:text-[#00B871] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Results
        </Link>
      </div>

      <div className="space-y-8">
        
        {/* 1. SCOREBOARD HERO */}
        <div className="overflow-hidden rounded-2xl bg-[#0A1628] text-white shadow-xl relative">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px]" />
          
          <div className="relative p-6 sm:p-10">
            {/* Header Stage Info */}
            <div className="mb-6 flex justify-center">
              <span className="inline-flex items-center rounded-full bg-[#00D084]/20 border border-[#00D084]/30 px-3.5 py-1 text-xs font-bold text-[#00D084] uppercase tracking-wider">
                {match.stage === "League" ? `Matchday ${match.matchday || ""}` : match.stage}
              </span>
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-4">
              
              {/* Home Team */}
              <div className="flex flex-1 flex-col items-center text-center gap-3">
                <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || "H")} size="large" />
                <h2 
                  className="text-base sm:text-2xl font-bold line-clamp-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {homeTeam?.name || "Home Team"}
                </h2>
              </div>

              {/* Large Score */}
              <div className="flex flex-col items-center justify-center flex-shrink-0 px-4">
                <div className="font-mono text-4xl sm:text-6xl font-black text-[#00D084] tracking-tight bg-white/5 border border-white/15 px-6 py-3 rounded-2xl shadow-inner">
                  {match.home_score} - {match.away_score}
                </div>
                {match.home_score !== null && match.away_score !== null && match.home_score === match.away_score &&
                 match.home_penalty_score !== null && match.home_penalty_score !== undefined &&
                 match.away_penalty_score !== null && match.away_penalty_score !== undefined && (
                  <div className="mt-2 text-sm font-bold text-emerald-500 font-mono bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                    Pen {match.home_penalty_score} - {match.away_penalty_score}
                  </div>
                )}
                <span className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Full Time
                </span>
              </div>

              {/* Away Team */}
              <div className="flex flex-1 flex-col items-center text-center gap-3">
                <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || "A")} size="large" />
                <h2 
                  className="text-base sm:text-2xl font-bold line-clamp-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {awayTeam?.name || "Away Team"}
                </h2>
              </div>

            </div>

            {/* Venue & Date Meta */}
            <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#00D084]" />
                <span>{formatDate(match.match_date)} {match.kick_off_time && `• ${formatTime(match.kick_off_time)}`}</span>
              </div>
              {match.venue_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#00D084]" />
                  <span>{match.venue_name}</span>
                </div>
              )}
            </div>

            {/* MOTM highlight */}
            {motmPlayer && (
              <div className="mt-6 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#FFD166]/10 border border-[#FFD166]/20 px-4 py-2 text-sm">
                  <Trophy className="h-4.5 w-4.5 text-[#FFD166]" />
                  <span className="font-bold text-[#FFD166]">
                    Man of the Match:
                  </span>
                  <span className="text-white font-medium">
                    {motmPlayer.name} ({motmTeam?.name || "Team"})
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 2. MATCH EVENTS TIMELINE */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
          <h3
            className="text-xl font-bold text-[#0F172A] mb-8 flex items-center gap-2 border-b border-[#E2E8F0] pb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            <Clock className="h-5 w-5 text-[#00D084]" />
            Match Timeline
          </h3>

          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 rounded-full bg-slate-50 p-3 text-slate-400">
                <Info className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#64748B]">No events recorded for this match</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 ml-3">
              {sortedEvents.map((event) => {
                const player = playersMap.get(event.player_id);
                const playerTeam = player ? teamsMap.get(player.team_id) : null;
                const meta = getEventMeta(event.type);

                return (
                  <div key={event.id} className="relative flex items-center gap-4 group">
                    {/* Timeline dot */}
                    <span className={`absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${meta.pillColor} ring-4 ring-slate-50 transition-transform group-hover:scale-110`} />

                    {/* Event Detail Card */}
                    <div className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${meta.bgColor}`}>
                      <span className="text-lg">{meta.icon}</span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-[#0F172A] font-bold">
                          {event.type?.toLowerCase() === 'own_goal' ? "OG" : (player?.name || "Player")}
                        </span>
                        {event.type?.toLowerCase() !== 'own_goal' ? (
                          <>
                            <span className="hidden sm:inline text-slate-400">•</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {playerTeam?.name || "Team"} ({meta.label})
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline text-slate-400">•</span>
                            <span className="text-xs text-slate-500 font-medium">
                              Own Goal
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-white/40 border border-slate-200/30 px-1.5 py-0.5 rounded">
                        {event.minute}&apos;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. AI MATCH REPORT */}
        {match.ai_report && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-sm">
            <h3
              className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2 border-b border-[#E2E8F0] pb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              <FileText className="h-5 w-5 text-[#00D084]" />
              Match Report
            </h3>
            <div className="prose max-w-none text-[#0F172A] text-sm leading-relaxed italic bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 font-serif">
              <p className="whitespace-pre-line">
                &ldquo;{match.ai_report}&rdquo;
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

interface TeamLogoProps {
  team: Team | null;
  fallbackText: string;
  size?: "default" | "large";
}

function TeamLogo({ 
  team, 
  fallbackText,
  size = "default"
}: TeamLogoProps) {
  const isLarge = size === "large";
  const dim = isLarge ? "h-16 w-16 text-lg rounded-2xl" : "h-8 w-8 text-xs rounded-lg";
  const imageDim = isLarge ? 64 : 32;

  return (
    <div className="relative flex-shrink-0">
      {team?.logo_url ? (
        <div className={`relative overflow-hidden border border-[#E2E8F0]/30 bg-white/5 ${isLarge ? "h-16 w-16 rounded-2xl" : "h-8 w-8 rounded-lg"}`}>
          <Image
            src={team.logo_url}
            alt={`${team.name} logo`}
            fill
            className="object-cover"
            sizes={`${imageDim}px`}
          />
        </div>
      ) : (
        <div className={`flex items-center justify-center bg-white/10 text-[#00D084] font-black border border-white/10 ${dim}`}>
          {fallbackText}
        </div>
      )}
    </div>
  );
}
