'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import BracketTree from '@/components/BracketTree';
import { Loader2, CalendarDays, Award, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function BracketClient({ tournament, initialKnockoutMatches, teams }: any) {
  const [matches, setMatches] = useState<any[]>(initialKnockoutMatches);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Score modal states
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [status, setStatus] = useState('scheduled');
  const [penaltyWinnerId, setPenaltyWinnerId] = useState<string>('');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleMatchClick = (match: any) => {
    // Only allow score updates if both teams are resolved in the match
    if (!match.home_team_id || !match.away_team_id) {
      alert("Both teams must be resolved in this bracket match before logging scores.");
      return;
    }

    setSelectedMatch(match);
    setHomeScore(match.home_score !== null ? match.home_score : 0);
    setAwayScore(match.away_score !== null ? match.away_score : 0);
    setStatus(match.status?.toLowerCase() || 'scheduled');
    setPenaltyWinnerId('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isDraw = Number(homeScore) === Number(awayScore);
      let winnerId = null;

      if (status?.toLowerCase() === 'completed') {
        if (isDraw) {
          // Update score in DB first
          const { error: dbErr } = await supabase
            .from('matches')
            .update({
              home_score: homeScore,
              away_score: awayScore,
              status
            })
            .eq('id', selectedMatch.id);

          if (dbErr) throw dbErr;

          alert('Knockout match ended in a draw. Redirecting to penalties to record the shootout.');
          router.push(`/admin/penalties?matchId=${selectedMatch.id}`);
          setIsModalOpen(false);
          router.refresh();
          return;
        } else {
          if (Number(homeScore) > Number(awayScore)) {
            winnerId = selectedMatch.home_team_id;
          } else {
            winnerId = selectedMatch.away_team_id;
          }
        }
      }

      // 1. Update score in DB (for non-draw matches)
      const { error: dbErr } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status
        })
        .eq('id', selectedMatch.id);

      if (dbErr) throw dbErr;

      // 2. Advance winner if completed
      if (status?.toLowerCase() === 'completed' && winnerId) {
        const { advanceKnockoutWinner } = await import('@/lib/bracket');
        await advanceKnockoutWinner(supabase, tournament.id, selectedMatch.stage, winnerId);
      }

      // Optimistic state updates
      setMatches(prev => prev.map(m => m.id === selectedMatch.id ? { ...m, home_score: homeScore, away_score: awayScore, status } : m));
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (matches.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 bg-white border border-gray-200 rounded-2xl shadow-sm mt-8">
        <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>No Knockout Bracket Yet</h3>
        <p className="text-sm text-gray-500 mt-2 mb-6">
          The playoff bracket will generate automatically when you schedule a Direct Knockout or a League + Knockout tournament format.
        </p>
        <Link
          href="/admin/fixtures"
          className="inline-flex items-center justify-center gap-2 bg-[#0A1628] hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl transition-all text-sm"
        >
          <CalendarDays size={16} /> Go to Fixtures & Wizard
        </Link>
      </div>
    );
  }

  const isDraw = Number(homeScore) === Number(awayScore);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
          Playoff Bracket
        </h1>
        <p className="text-sm text-gray-500 mt-1">View the visual elimination tree. Click match cards to enter scores and advance winners.</p>
      </div>

      <BracketTree matches={matches} onMatchClick={handleMatchClick} isAdmin={true} />

      {isModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#0A1628] text-white">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                  Log Playoff Score
                </h2>
                <span className="text-xs text-gray-300 font-medium">{selectedMatch.stage}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveResult} className="p-6 space-y-5">
              {/* Scoring row */}
              <div className="flex justify-between items-center gap-6">
                <div className="flex-1 flex flex-col items-center text-center gap-2">
                  <span className="text-xs font-bold text-gray-600 line-clamp-1">
                    {selectedMatch.home_team?.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={homeScore}
                    onChange={e => setHomeScore(Number(e.target.value))}
                    className="w-16 h-16 text-3xl font-extrabold text-center bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40"
                  />
                </div>
                <span className="text-gray-400 font-bold text-xl mt-6">-</span>
                <div className="flex-1 flex flex-col items-center text-center gap-2">
                  <span className="text-xs font-bold text-gray-600 line-clamp-1">
                    {selectedMatch.away_team?.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={awayScore}
                    onChange={e => setAwayScore(Number(e.target.value))}
                    className="w-16 h-16 text-3xl font-extrabold text-center bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40"
                  />
                </div>
              </div>

              {/* Status input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={status?.toLowerCase()}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                </select>
              </div>

              {/* Penalty shootout tiebreaker (Only if Completed and draw score) */}
              {status?.toLowerCase() === 'completed' && isDraw && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-yellow-800 flex items-center gap-1">
                    <Award size={14} /> Penalty Shootout Winner Required
                  </h4>
                  <p className="text-[11px] text-yellow-700">
                    Playoff games cannot end in a tie. Select the team that won the shootout to advance them.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setPenaltyWinnerId(selectedMatch.home_team_id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center ${
                        penaltyWinnerId === selectedMatch.home_team_id
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-900 ring-2 ring-yellow-400/20'
                          : 'bg-white border-yellow-200 text-yellow-800 hover:bg-yellow-100/30'
                      }`}
                    >
                      {selectedMatch.home_team?.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPenaltyWinnerId(selectedMatch.away_team_id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all text-center ${
                        penaltyWinnerId === selectedMatch.away_team_id
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-900 ring-2 ring-yellow-400/20'
                          : 'bg-white border-yellow-200 text-yellow-800 hover:bg-yellow-100/30'
                      }`}
                    >
                      {selectedMatch.away_team?.name}
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#00D084]/15"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirm & Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
