import { createServerClient } from '@/lib/supabase-server';
import { getSelectedTournamentId } from '@/lib/tournament';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, Radio, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

export default async function AdminResultsPage() {
  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) redirect('/admin');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, venue')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8">Tournament not found</div>;

  // Fetch all matches with team details
  const { data: matchesData } = await supabase
    .from('matches')
    .select(`
      id,
      match_date,
      kick_off_time,
      status,
      stage,
      matchday,
      home_score,
      away_score,
      home_team:home_team_id (id, name, logo_url),
      away_team:away_team_id (id, name, logo_url)
    `)
    .eq('tournament_id', tournamentId)
    .order('match_date', { ascending: true })
    .order('kick_off_time', { ascending: true });

  const matches = matchesData || [];

  // Group by status priority: live > scheduled > completed
  const liveMatches = matches.filter(m => m.status?.toLowerCase() === 'live');
  const scheduledMatches = matches.filter(m => m.status?.toLowerCase() === 'scheduled');
  const completedMatches = matches.filter(m => m.status?.toLowerCase() === 'completed');
  const postponedMatches = matches.filter(m => m.status?.toLowerCase() === 'postponed');

  const sections = [
    { title: 'Live Now', icon: Radio, matches: liveMatches, color: 'red', emptyText: 'No live matches' },
    { title: 'Upcoming / Scheduled', icon: Clock, matches: scheduledMatches, color: 'blue', emptyText: 'No scheduled matches' },
    { title: 'Completed', icon: CheckCircle2, matches: completedMatches, color: 'green', emptyText: 'No completed matches' },
    { title: 'Postponed', icon: Clock, matches: postponedMatches, color: 'yellow', emptyText: 'No postponed matches' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1
          className="text-2xl font-bold text-gray-900 flex items-center gap-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <ClipboardList size={24} className="text-[#00D084]" />
          Match Centre
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Click on any match to manage scores, log events, and generate reports.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <ClipboardList size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            No matches yet
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Generate fixtures first from the{' '}
            <Link href="/admin/fixtures" className="text-[#00D084] font-semibold hover:underline">
              Fixtures &amp; Scheduler
            </Link>{' '}
            page.
          </p>
        </div>
      ) : (
        sections.map((section) => {
          if (section.matches.length === 0) return null;

          const colorMap: Record<string, { dot: string; bg: string; border: string; text: string; headerBg: string }> = {
            red: { dot: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', headerBg: 'bg-red-500' },
            blue: { dot: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', headerBg: 'bg-[#0A1628]' },
            green: { dot: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', headerBg: 'bg-green-600' },
            yellow: { dot: 'bg-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', headerBg: 'bg-yellow-500' },
          };

          const c = colorMap[section.color];
          const Icon = section.icon;

          return (
            <div key={section.title} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Section Header */}
              <div className={`${c.headerBg} px-6 py-3.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5 text-white">
                  {section.color === 'red' && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                    </span>
                  )}
                  <Icon size={18} />
                  <span className="font-bold text-sm uppercase tracking-wider">{section.title}</span>
                </div>
                <span className="bg-white/20 text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {section.matches.length}
                </span>
              </div>

              {/* Match Cards */}
              <div className="divide-y divide-gray-100">
                {section.matches.map((match: any) => (
                  <Link
                    key={match.id}
                    href={`/admin/results/${match.id}`}
                    className="flex items-center p-4 sm:px-6 hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Date */}
                    <div className="hidden sm:block w-20 flex-shrink-0 text-center mr-4">
                      <div className="text-xs font-bold text-gray-400 uppercase">
                        {match.match_date
                          ? new Date(match.match_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                          : 'TBD'}
                      </div>
                      <div className="text-[10px] text-gray-300 font-mono mt-0.5">
                        {match.kick_off_time?.slice(0, 5) || '—'}
                      </div>
                    </div>

                    {/* Match Info */}
                    <div className="flex-1 grid grid-cols-3 items-center gap-2 min-w-0">
                      {/* Home Team */}
                      <div className="text-right">
                        <span className="font-bold text-gray-900 text-sm truncate block">
                          {(match.home_team as any)?.name || 'TBD'}
                        </span>
                      </div>

                      {/* Score / Time */}
                      <div className="text-center">
                        {match.status?.toLowerCase() === 'completed' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-extrabold text-base text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                              {match.home_score ?? 0}
                            </span>
                            <span className="text-gray-400 text-xs font-bold">-</span>
                            <span className="font-extrabold text-base text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                              {match.away_score ?? 0}
                            </span>
                          </div>
                        ) : match.status?.toLowerCase() === 'live' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-extrabold text-base text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              {match.home_score ?? 0}
                            </span>
                            <span className="text-red-400 text-xs font-bold">-</span>
                            <span className="font-extrabold text-base text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              {match.away_score ?? 0}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div>
                        <span className="font-bold text-gray-900 text-sm truncate block">
                          {(match.away_team as any)?.name || 'TBD'}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge + Arrow */}
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <span className={`hidden sm:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text} ${c.border} border`}>
                        {match.stage || 'League'}
                      </span>
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-[#00D084] transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
