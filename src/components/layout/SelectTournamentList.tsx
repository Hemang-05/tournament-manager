'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ArrowRight } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  status: string;
  sport: string | null;
  format: string | null;
  start_date: string | null;
  end_date: string | null;
}

export default function SelectTournamentList({ tournaments }: { tournaments: Tournament[] }) {
  const router = useRouter();

  const handleSelect = (id: string) => {
    document.cookie = `selected_tournament_id=${id}; path=/`;
    router.push('/admin');
    router.refresh();
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    completed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const sportEmojis: Record<string, string> = {
    football: '⚽',
    cricket: '🏏',
    basketball: '🏀',
    pickleball: '🏓',
    other: '🎯',
  };

  const formatLabels: Record<string, string> = {
    league: 'League',
    knockout: 'Knockout',
    league_knockout: 'League + Knockout',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {tournaments.map((t) => {
        const emoji = sportEmojis[t.sport?.toLowerCase() || 'other'] || '🎯';
        const formatLabel = formatLabels[t.format?.toLowerCase() || 'league'] || t.format || 'League';
        const start = t.start_date ? new Date(t.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD';
        const end = t.end_date ? new Date(t.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD';
        const statusVal = t.status === 'active' ? 'Live' : t.status === 'completed' ? 'Completed' : 'Draft';

        return (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            className="text-left bg-white p-6 rounded-2xl border border-gray-200 hover:border-[#00D084] hover:shadow-lg hover:shadow-[#00D084]/5 transition-all duration-300 group flex flex-col justify-between h-full relative"
          >
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl bg-slate-50 p-2.5 rounded-xl border border-slate-100">{emoji}</div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[t.status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                  {statusVal}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#00D084] transition-colors" style={{ fontFamily: 'Georgia, serif' }}>
                {t.name}
              </h3>

              <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="font-semibold text-gray-700">{formatLabel}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{start} – {end}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between w-full mt-auto">
              <span className="text-xs font-semibold text-gray-400">Click to manage</span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00D084] group-hover:gap-2 transition-all">
                Enter Dashboard <ArrowRight size={14} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
