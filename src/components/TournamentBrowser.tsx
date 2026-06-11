'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Trophy, Search, ArrowRight, Calendar, Users, MapPin } from 'lucide-react';
import { getDisplayStatus } from '@/lib/tournament';

/* ───────── Types ───────── */
interface Tournament {
  id: string;
  name: string;
  slug: string;
  sport: string | null;
  sport_custom: string | null;
  format: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  max_teams: number;
  is_public: boolean;
  organiser_id: string;
  organisers: { name: string } | null;
}

interface Props {
  tournaments: Tournament[];
}

/* ───────── Helpers ───────── */
const formatOrganiserNamesOnly = (joinedName: string | null | undefined) => {
  if (!joinedName) return '';
  return joinedName.split(' | ').map(part => {
    const contactIndex = part.indexOf(' (Contact: ');
    if (contactIndex !== -1) {
      return part.substring(0, contactIndex);
    }
    return part;
  }).join(' & ');
};

const SPORT_EMOJI: Record<string, string> = {
  Football: '⚽',
  Cricket: '🏏',
  Basketball: '🏀',
  Pickleball: '🏓',
  Other: '🎯',
};

const SPORT_TABS = ['All', 'Football', 'Cricket', 'Basketball', 'Pickleball', 'Other'] as const;
const STATUS_TABS = ['All', 'Live', 'Upcoming', 'Completed'] as const;

function mapStatus(dbStatus: string, startDate?: string | null): 'Live' | 'Upcoming' | 'Completed' {
  return getDisplayStatus(dbStatus, startDate);
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Dates TBD';
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const fmtYear = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  if (start && end) {
    const sYear = start.slice(0, 4);
    const eYear = end.slice(0, 4);
    if (sYear === eYear) return `${fmt(start)} – ${fmtYear(end)}`;
    return `${fmtYear(start)} – ${fmtYear(end)}`;
  }
  if (start) return `From ${fmtYear(start)}`;
  return `Until ${fmtYear(end!)}`;
}

function getSportLabel(t: Tournament): string {
  if (t.sport === 'Other' && t.sport_custom) return t.sport_custom;
  return t.sport || 'Other';
}

/* ───────── Component ───────── */
export default function TournamentBrowser({ tournaments }: Props) {
  const [sportFilter, setSportFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      // Sport filter
      if (sportFilter !== 'All') {
        const sportLabel = t.sport || 'Other';
        if (sportFilter === 'Other') {
          if (sportLabel !== 'Other') return false;
        } else {
          if (sportLabel !== sportFilter) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'All') {
        const mapped = mapStatus(t.status, t.start_date);
        if (mapped !== statusFilter) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const searchable = [
          t.name,
          t.venue_name,
          t.organisers?.name,
          getSportLabel(t),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [tournaments, sportFilter, statusFilter, search]);

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* ═══════ Hero Header ═══════ */}
      <header className="relative bg-[#0A1628] overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />
        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-[#00D084]/6 blur-[140px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D084] to-[#00B871] shadow-lg shadow-[#00D084]/20">
              <Trophy className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Tournament<span className="text-[#00D084]">Mgr</span>
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight max-w-2xl"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Find and follow local{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D084] to-[#34D399]">
              tournaments
            </span>{' '}
            near you
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#94A3B8] max-w-xl leading-relaxed">
            Browse live scores, fixtures, and standings for football, cricket, basketball, pickleball
            and more — all in one place.
          </p>

        </div>
      </header>

      {/* ═══════ Filter Bar ═══════ */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3">
            {/* Sport tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mr-2 flex-shrink-0">
                Sport
              </span>
              {SPORT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSportFilter(tab)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    sportFilter === tab
                      ? 'bg-[#0A1628] text-white shadow-sm'
                      : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#374151]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mr-2 flex-shrink-0">
                Status
              </span>
              {STATUS_TABS.map((tab) => {
                const dotColors: Record<string, string> = {
                  Live: 'bg-green-500',
                  Upcoming: 'bg-blue-400',
                  Completed: 'bg-gray-400',
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      statusFilter === tab
                        ? 'bg-[#0A1628] text-white shadow-sm'
                        : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#374151]'
                    }`}
                  >
                    {tab !== 'All' && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          statusFilter === tab ? 'bg-current' : dotColors[tab]
                        } ${tab === 'Live' && statusFilter !== tab ? 'animate-pulse' : ''}`}
                      />
                    )}
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Tournament Grid ═══════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Result count */}
        <p className="text-sm text-[#64748B] mb-6">
          {filtered.length === 0
            ? 'No tournaments found'
            : `${filtered.length} tournament${filtered.length !== 1 ? 's' : ''} found`}
        </p>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        ) : (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                <Trophy className="h-10 w-10 text-[#CBD5E1]" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-[#00D084]/10 flex items-center justify-center">
                <Search className="h-4 w-4 text-[#00D084]" />
              </div>
            </div>
            <h3
              className="text-xl font-bold text-[#1E293B] mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              No tournaments found
            </h3>
            <p className="text-sm text-[#64748B] max-w-sm leading-relaxed">
              {search || sportFilter !== 'All' || statusFilter !== 'All'
                ? 'Try adjusting your filters or search term to find what you\'re looking for.'
                : 'There are no public tournaments yet. Check back soon!'}
            </p>
            {(search || sportFilter !== 'All' || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSportFilter('All');
                  setStatusFilter('All');
                }}
                className="mt-4 px-4 py-2 text-sm font-semibold text-[#00D084] hover:bg-[#00D084]/5 rounded-lg transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </main>

      {/* ═══════ Footer ═══════ */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#00D084] to-[#00B871]">
                <Trophy className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-[#0F172A]">
                Tournament<span className="text-[#00D084]">Mgr</span>
              </span>
              <span>·</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <Link
              href="/host"
              className="inline-flex items-center justify-center bg-[#00D084] text-[#0A1628] hover:bg-[#00B871] font-bold px-4 py-2 rounded-xl text-sm transition-all duration-200 shadow-sm"
            >
              Host Tournament
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Tournament Card
   ═══════════════════════════════════════════════ */
function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const status = mapStatus(t.status, t.start_date);
  const sportLabel = getSportLabel(t);
  const emoji = SPORT_EMOJI[t.sport || 'Other'] || '🎯';

  const statusConfig: Record<
    string,
    { bg: string; text: string; dot: string; pulse: boolean }
  > = {
    Live: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      pulse: true,
    },
    Upcoming: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-400',
      pulse: false,
    },
    Completed: {
      bg: 'bg-gray-50 border-gray-200',
      text: 'text-gray-500',
      dot: 'bg-gray-400',
      pulse: false,
    },
  };

  const sc = statusConfig[status];

  return (
    <Link
      href={`/t/${t.slug}`}
      className="group relative bg-white rounded-xl border border-[#E8ECF1] hover:border-[#00D084]/40 hover:shadow-lg hover:shadow-[#00D084]/5 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          status === 'Live'
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : status === 'Upcoming'
            ? 'bg-gradient-to-r from-blue-400 to-indigo-400'
            : 'bg-gradient-to-r from-gray-300 to-gray-400'
        }`}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row: sport label + status */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-[#E8ECF1] px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5">
            <span className="text-sm">{emoji}</span>
            {sportLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`}
            />
            {status === 'Live' ? 'LIVE' : status}
          </span>
        </div>

        {/* Tournament name */}
        <h3
          className="text-lg font-bold text-[#0F172A] leading-snug group-hover:text-[#00D084] transition-colors line-clamp-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {t.name}
        </h3>

        {/* Organiser / venue */}
        <div className="mt-2 space-y-1">
          {t.organisers?.name && (
            <p className="text-sm text-[#64748B] flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
              {formatOrganiserNamesOnly(t.organisers.name)}
            </p>
          )}
          {t.venue_name && (
            <p className="text-sm text-[#64748B] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
              {t.venue_name}
            </p>
          )}
        </div>

        {/* Date range */}
        <p className="mt-3 text-sm text-[#475569] flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-[#94A3B8] flex-shrink-0" />
          {formatDateRange(t.start_date, t.end_date)}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: meta + button */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Team count */}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md">
              <Users className="h-3 w-3" />
              {t.max_teams} teams
            </span>
            {/* Format badge */}
            <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md">
              {t.format}
            </span>
            {/* Sport pill */}
            <span className="text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded-md hidden sm:inline-flex">
              {sportLabel}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00D084] group-hover:gap-2 transition-all">
            View
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
