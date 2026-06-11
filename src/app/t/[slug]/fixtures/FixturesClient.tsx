'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/image';
import NextLink from 'next/link';
import { Calendar, MapPin, Clock } from 'lucide-react';
import MatchDetailModal from '@/components/public/MatchDetailModal';

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
  venue_name?: string | null;
  match_events?: MatchEvent[];
}

interface FixturesClientProps {
  tournament: { id: string; name: string; slug: string };
  teams: Team[];
  matches: Match[];
  players: Player[];
  activeFilter: string;
}

export default function FixturesClient({
  tournament,
  teams,
  matches,
  players,
  activeFilter,
}: FixturesClientProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const teamsMap = new Map<string, Team>();
  teams.forEach((t) => teamsMap.set(t.id, t));

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedMatch) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedMatch]);

  // Group matches by matchday
  const groupedByMatchday: Record<string, Match[]> = {};
  matches.forEach((match) => {
    let groupKey = "General Fixtures";
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

  // Sort group keys
  const sortedGroupKeys = Object.keys(groupedByMatchday).sort((a, b) => {
    const aNum = parseInt(a.replace(/^\D+/g, ""), 10);
    const bNum = parseInt(b.replace(/^\D+/g, ""), 10);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });

  // Helper to format date header
  const formatDateHeader = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper to format time
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "TBD";
    const parts = timeStr.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
  };

  // Helper to get initials
  const getTeamInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-[#E2E8F0] pb-6">
        <div>
          <h1
            className="text-3xl font-extrabold text-[#0F172A] sm:text-4xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Fixtures
          </h1>
          <p className="mt-2 text-sm text-[#64748B] font-medium">
            Upcoming matches scheduled for {tournament.name}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterLink label="All" filter="all" active={activeFilter === "all"} slug={tournament.slug} />
          <FilterLink label="This Week" filter="this-week" active={activeFilter === "this-week"} slug={tournament.slug} />
          <FilterLink label="League" filter="league" active={activeFilter === "league"} slug={tournament.slug} />
          <FilterLink label="Knockout" filter="knockout" active={activeFilter === "knockout"} slug={tournament.slug} />
        </div>
      </div>

      {/* Fixtures Listing */}
      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white px-6 py-24 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#00D084]/10 text-[#00D084]">
            <Calendar className="h-6 w-6" />
          </div>
          <h3
            className="text-lg font-bold text-[#0F172A]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            No upcoming fixtures found
          </h3>
          <p className="mt-1 max-w-xs text-sm text-[#64748B]">
            There are no fixtures matching the &quot;{activeFilter}&quot; filter at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedGroupKeys.map((groupKey) => {
            const groupMatches = groupedByMatchday[groupKey];
            
            // Group matches inside this matchday by their dates
            const matchesByDate: Record<string, Match[]> = {};
            groupMatches.forEach((m) => {
              if (!matchesByDate[m.match_date]) {
                matchesByDate[m.match_date] = [];
              }
              matchesByDate[m.match_date].push(m);
            });

            const sortedDates = Object.keys(matchesByDate).sort();

            return (
              <div key={groupKey} className="space-y-4">
                {/* Matchday Header */}
                <h2
                  className="text-xl font-bold text-[#0A1628] border-b border-[#E2E8F0] pb-2 uppercase tracking-wide text-sm"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  {groupKey}
                </h2>

                <div className="space-y-6">
                  {sortedDates.map((dateStr) => {
                    const dateMatches = matchesByDate[dateStr];
                    return (
                      <div key={dateStr} className="space-y-3">
                        {/* Date Subheader */}
                        <h3 className="text-xs font-bold text-[#64748B] tracking-wider uppercase bg-[#F8FAFC] py-1 px-3 rounded-md inline-block">
                          {formatDateHeader(dateStr)}
                        </h3>

                        {/* Fixtures list */}
                        <div className="grid grid-cols-1 gap-4">
                          {dateMatches.map((match) => {
                            const homeTeam = teamsMap.get(match.home_team_id);
                            const awayTeam = teamsMap.get(match.away_team_id);
                            const isLive = match.status?.toLowerCase() === 'live';

                            return (
                              <div
                                key={match.id}
                                onClick={() => {
                                  if (isLive) setSelectedMatch(match);
                                }}
                                className={`group rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all ${
                                  isLive ? 'border-green-300 bg-green-50/10 cursor-pointer hover:border-green-400 hover:shadow-md' : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                  
                                  {/* Match Core: Home Team - Time - Away Team */}
                                  <div className="flex-1 flex items-center justify-between">
                                    {/* Home Team */}
                                    <div className="flex flex-1 items-center justify-end gap-3 text-right">
                                      <span className="text-sm sm:text-base font-bold text-[#0F172A] line-clamp-1">
                                        {homeTeam?.name || "Home Team"}
                                      </span>
                                      <TeamLogo team={homeTeam} fallbackText={getTeamInitials(homeTeam?.name || "H")} />
                                    </div>

                                    {/* Time / VS Box */}
                                    <div className="mx-4 flex flex-col items-center justify-center flex-shrink-0">
                                      {isLive ? (
                                        <div className="font-mono text-sm sm:text-base font-extrabold bg-green-50 border border-green-200 text-green-600 px-3 py-1 rounded-lg">
                                          {match.home_score ?? 0} - {match.away_score ?? 0}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 font-mono text-sm sm:text-base font-extrabold text-[#0A1628] bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-1.5 rounded-lg">
                                          <Clock className="h-3.5 w-3.5 text-[#00D084]" />
                                          <span>{formatTime(match.kick_off_time)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Away Team */}
                                    <div className="flex flex-1 items-center justify-start gap-3 text-left">
                                      <TeamLogo team={awayTeam} fallbackText={getTeamInitials(awayTeam?.name || "A")} />
                                      <span className="text-sm sm:text-base font-bold text-[#0F172A] line-clamp-1">
                                        {awayTeam?.name || "Away Team"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right side: Venue & Status badge */}
                                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                                    {/* Venue */}
                                    {match.venue_name && (
                                      <div className="flex items-center gap-1 text-xs text-[#64748B] font-medium">
                                        <MapPin className="h-3.5 w-3.5 text-[#00D084] flex-shrink-0" />
                                        <span className="line-clamp-1">{match.venue_name}</span>
                                      </div>
                                    )}

                                    {/* Status Badge */}
                                    <StatusBadge status={match.status} />
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
              </div>
            );
          })}
        </div>
      )}

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={selectedMatch}
        teams={teams}
        players={players}
        onClose={() => setSelectedMatch(null)}
      />
    </div>
  );
}

/* ─── FilterLink & StatusBadge Helper Subcomponents ─── */

function FilterLink({
  label,
  filter,
  active,
  slug,
}: {
  label: string;
  filter: string;
  active: boolean;
  slug: string;
}) {
  return (
    <NextLink
      href={`/t/${slug}/fixtures?filter=${filter}`}
      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
        active
          ? "bg-[#00D084] text-[#0A1628] shadow-md shadow-[#00D084]/20"
          : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#64748B]/30 hover:text-[#0F172A]"
      }`}
    >
      {label}
    </NextLink>
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
          <img
            src={team.logo_url}
            alt={`${team.name} logo`}
            className="w-full h-full object-cover"
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

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFD166]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#F59E0B] border border-[#FFD166]/30 uppercase tracking-wider animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
        LIVE
      </span>
    );
  }

  if (status === "postponed") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-[#EF4444] border border-red-200 uppercase tracking-wider">
        Postponed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold text-[#64748B] border border-slate-200 uppercase tracking-wider">
      Scheduled
    </span>
  );
}
