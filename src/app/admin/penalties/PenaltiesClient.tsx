'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  Trophy,
  ArrowLeft,
  Check,
  X,
  ShieldAlert,
  Loader2,
  RotateCcw,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  group_name?: string | null;
}

interface Player {
  id: string;
  name: string;
  team_id: string;
  role?: string | null;
}

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  stage: string;
  status: string;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
}

interface PenaltyKick {
  playerId: string;
  result: 'scored' | 'missed' | null;
}

interface PenaltiesClientProps {
  tournament: { id: string; name: string; format: string };
  teams: Team[];
  players: Player[];
  matches: Match[];
}

export default function PenaltiesClient({
  tournament,
  teams,
  players,
  matches,
}: PenaltiesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Parse parameters from URL
  const queryMatchId = searchParams.get('matchId');
  const queryTeamA = searchParams.get('teamA');
  const queryTeamB = searchParams.get('teamB');

  const [mode, setMode] = useState<'match' | 'group'>(queryMatchId ? 'match' : 'group');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(queryMatchId || '');
  const [teamAId, setTeamAId] = useState<string>(queryTeamA || '');
  const [teamBId, setTeamBId] = useState<string>(queryTeamB || '');

  // Kicks array state
  const [kicksA, setKicksA] = useState<PenaltyKick[]>(
    Array(3)
      .fill(null)
      .map(() => ({ playerId: '', result: null }))
  );
  const [kicksB, setKicksB] = useState<PenaltyKick[]>(
    Array(3)
      .fill(null)
      .map(() => ({ playerId: '', result: null }))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Get completed matches that ended in a draw (valid for Match Tie-breaker)
  const drawnMatches = matches.filter(
    (m) =>
      m.status?.toLowerCase() === 'completed' &&
      m.home_score !== null &&
      m.home_score === m.away_score
  );

  // If URL parameter changed, update mode and states
  useEffect(() => {
    if (queryMatchId) {
      setMode('match');
      setSelectedMatchId(queryMatchId);
    } else if (queryTeamA && queryTeamB) {
      setMode('group');
      setTeamAId(queryTeamA);
      setTeamBId(queryTeamB);
    }
  }, [queryMatchId, queryTeamA, queryTeamB]);

  // When selected match changes, update Team A and Team B and load initial kicks if any
  useEffect(() => {
    if (mode === 'match' && selectedMatchId) {
      const match = matches.find((m) => m.id === selectedMatchId);
      if (match) {
        setTeamAId(match.home_team_id);
        setTeamBId(match.away_team_id);

        const loadExistingKicks = async () => {
          const { data: events } = await supabase
            .from('match_events')
            .select('*')
            .eq('match_id', selectedMatchId)
            .in('type', ['penalty_scored', 'penalty_missed'])
            .order('minute', { ascending: true }); // minute represents kick index (1-indexed)

          if (events && events.length > 0) {
            const loadedA: PenaltyKick[] = [];
            const loadedB: PenaltyKick[] = [];

            // Calculate max kicks in events
            const maxKicks = Math.max(3, Math.ceil(events.length / 2));
            for (let i = 1; i <= maxKicks; i++) {
              // Get event for home team at index i
              const evHome = events.find(
                (e) =>
                  e.minute === i &&
                  players.find((p) => p.id === e.player_id)?.team_id === match.home_team_id
              );
              // Get event for away team at index i
              const evAway = events.find(
                (e) =>
                  e.minute === i &&
                  players.find((p) => p.id === e.player_id)?.team_id === match.away_team_id
              );

              loadedA.push({
                playerId: evHome?.player_id || '',
                result:
                  evHome?.type === 'penalty_scored'
                    ? 'scored'
                    : evHome?.type === 'penalty_missed'
                    ? 'missed'
                    : null,
              });
              loadedB.push({
                playerId: evAway?.player_id || '',
                result:
                  evAway?.type === 'penalty_scored'
                    ? 'scored'
                    : evAway?.type === 'penalty_missed'
                    ? 'missed'
                    : null,
              });
            }

            setKicksA(loadedA);
            setKicksB(loadedB);
          } else {
            // Reset to 3 empty slots
            setKicksA(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
            setKicksB(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
          }
        };

        loadExistingKicks();
      }
    }
  }, [selectedMatchId, mode]);

  const teamA = teams.find((t) => t.id === teamAId);
  const teamB = teams.find((t) => t.id === teamBId);

  const playersA = players.filter((p) => p.team_id === teamAId);
  const playersB = players.filter((p) => p.team_id === teamBId);

  const scoreA = kicksA.filter((k) => k.result === 'scored').length;
  const scoreB = kicksB.filter((k) => k.result === 'scored').length;

  const allKicksTaken =
    kicksA.every((k) => k.result !== null) && kicksB.every((k) => k.result !== null);
  const isTied = scoreA === scoreB;

  // Handles adding sudden death penalty slots
  const handleAddSuddenDeath = () => {
    setKicksA([...kicksA, { playerId: '', result: null }]);
    setKicksB([...kicksB, { playerId: '', result: null }]);
  };

  // Resets all kicks back to clean slate
  const handleResetAllKicks = () => {
    if (window.confirm('Are you sure you want to reset all logged penalties?')) {
      setKicksA(
        Array(3)
          .fill(null)
          .map(() => ({ playerId: '', result: null }))
      );
      setKicksB(
        Array(3)
          .fill(null)
          .map(() => ({ playerId: '', result: null }))
      );
      setError('');
    }
  };

  // Clear a specific kick slot
  const clearKickSlot = (team: 'A' | 'B', index: number) => {
    if (team === 'A') {
      const copy = [...kicksA];
      copy[index] = { playerId: '', result: null };
      setKicksA(copy);
    } else {
      const copy = [...kicksB];
      copy[index] = { playerId: '', result: null };
      setKicksB(copy);
    }
  };

  // Directly log a result when tapping Green/Red in player roster list
  const handlePlayerTap = (team: 'A' | 'B', playerId: string, result: 'scored' | 'missed') => {
    const kicks = team === 'A' ? kicksA : kicksB;
    const setKicks = team === 'A' ? setKicksA : setKicksB;

    // Find the first kick slot that doesn't have a result yet
    const emptyIndex = kicks.findIndex((k) => k.result === null);

    if (emptyIndex !== -1) {
      const copy = [...kicks];
      copy[emptyIndex] = { playerId, result };
      setKicks(copy);
    } else {
      // If all are filled, automatically append a sudden death slot
      const newIndex = kicks.length;
      if (team === 'A') {
        setKicksA([...kicksA, { playerId, result }]);
        setKicksB([...kicksB, { playerId: '', result: null }]);
      } else {
        setKicksA([...kicksA, { playerId: '', result: null }]);
        setKicksB([...kicksB, { playerId, result }]);
      }
    }
    setError('');
  };

  // Clean single slot update
  const updateKickResult = (team: 'A' | 'B', index: number, field: keyof PenaltyKick, value: any) => {
    if (team === 'A') {
      const copy = [...kicksA];
      copy[index] = { ...copy[index], [field]: value };
      setKicksA(copy);
    } else {
      const copy = [...kicksB];
      copy[index] = { ...copy[index], [field]: value };
      setKicksB(copy);
    }
    setError('');
  };

  // Save the shootout to Supabase
  const handleSaveShootout = async () => {
    if (!teamAId || !teamBId) {
      setError('Please select both teams.');
      return;
    }
    if (teamAId === teamBId) {
      setError('A team cannot play against itself.');
      return;
    }
    if (scoreA === scoreB) {
      setError('Penalty shootout cannot end in a draw. Please log Sudden Death to resolve the winner.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let matchId = selectedMatchId;

      if (mode === 'group') {
        // Create new shootout match
        const today = new Date().toISOString().split('T')[0];
        const { data: newMatch, error: matchErr } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournament.id,
            home_team_id: teamAId,
            away_team_id: teamBId,
            home_score: scoreA,
            away_score: scoreB,
            home_penalty_score: scoreA,
            away_penalty_score: scoreB,
            status: 'completed',
            stage: 'Group Tie-breaker',
            match_date: today,
            kick_off_time: '12:00',
            matchday: 1,
          })
          .select()
          .single();

        if (matchErr || !newMatch) throw matchErr || new Error('Failed to create tiebreaker match');
        matchId = newMatch.id;
      } else {
        // Update existing match
        const { error: matchErr } = await supabase
          .from('matches')
          .update({
            home_penalty_score: scoreA,
            away_penalty_score: scoreB,
          })
          .eq('id', matchId);

        if (matchErr) throw matchErr;

        // Knockout bracket advancement & playoffs resolution logic
        const selectedMatch = matches.find((m) => m.id === matchId);
        if (selectedMatch) {
          const isKnockout =
            selectedMatch.stage &&
            (selectedMatch.stage.startsWith('Round of 16') ||
              selectedMatch.stage.startsWith('Quarter-final') ||
              selectedMatch.stage.startsWith('Semi-final') ||
              selectedMatch.stage.startsWith('Final'));

          if (isKnockout) {
            const winnerTeamId = scoreA > scoreB ? teamAId : teamBId;
            const { advanceKnockoutWinner } = await import('@/lib/bracket');
            await advanceKnockoutWinner(supabase, tournament.id, selectedMatch.stage, winnerTeamId);
          } else {
            const { resolveGroupPlayoffs } = await import('@/lib/bracket');
            await resolveGroupPlayoffs(supabase, tournament.id);
          }
        }
      }

      // Delete any previous penalty shootout events for this match to prevent duplicates
      await supabase
        .from('match_events')
        .delete()
        .eq('match_id', matchId)
        .in('type', ['penalty_scored', 'penalty_missed']);

      // Log kicks as match_events
      const eventsToInsert: any[] = [];

      kicksA.forEach((kick, idx) => {
        if (kick.result && kick.playerId) {
          eventsToInsert.push({
            match_id: matchId,
            player_id: kick.playerId,
            type: kick.result === 'scored' ? 'penalty_scored' : 'penalty_missed',
            minute: idx + 1, // minute represents index of the kick
          });
        }
      });

      kicksB.forEach((kick, idx) => {
        if (kick.result && kick.playerId) {
          eventsToInsert.push({
            match_id: matchId,
            player_id: kick.playerId,
            type: kick.result === 'scored' ? 'penalty_scored' : 'penalty_missed',
            minute: idx + 1,
          });
        }
      });

      if (eventsToInsert.length > 0) {
        const { error: eventsErr } = await supabase.from('match_events').insert(eventsToInsert);
        if (eventsErr) throw eventsErr;
      }

      alert('Penalty shootout successfully saved!');
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the shootout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back Link */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00D084] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 pb-5">
        <h1
          className="text-2xl font-bold text-gray-900 flex items-center gap-2"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          <Trophy size={24} className="text-[#00D084]" />
          Record Penalty Shootout
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select teams or a drawn match, and tap green/red next to player names as they take their penalties.
        </p>
      </div>

      {/* Mode Selectors */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit border border-gray-200">
        <button
          onClick={() => {
            setMode('group');
            setSelectedMatchId('');
            setTeamAId('');
            setTeamBId('');
            setKicksA(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
            setKicksB(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
            setError('');
          }}
          disabled={!!queryMatchId}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'group'
              ? 'bg-[#0A1628] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800 disabled:opacity-50'
          }`}
        >
          Group Tie-breaker
        </button>
        <button
          onClick={() => {
            setMode('match');
            setTeamAId('');
            setTeamBId('');
            setKicksA(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
            setKicksB(
              Array(3)
                .fill(null)
                .map(() => ({ playerId: '', result: null }))
            );
            setError('');
          }}
          disabled={!!queryTeamA && !!queryTeamB}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'match'
              ? 'bg-[#0A1628] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-800 disabled:opacity-50'
          }`}
        >
          Match Draw Resolution
        </button>
      </div>

      {/* Select Match or Teams Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
        {mode === 'match' ? (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Select Drawn Match *
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40"
            >
              <option value="">-- Choose Match --</option>
              {drawnMatches.map((m) => {
                const home = teams.find((t) => t.id === m.home_team_id)?.name || 'Home';
                const away = teams.find((t) => t.id === m.away_team_id)?.name || 'Away';
                return (
                  <option key={m.id} value={m.id}>
                    {home} {m.home_score} - {m.away_score} {away} ({m.stage})
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Team A *</label>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40"
              >
                <option value="">-- Select Team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.group_name ? `(${t.group_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Team B *</label>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40"
              >
                <option value="">-- Select Team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.group_name ? `(${t.group_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {teamAId && teamBId && (
        <div className="space-y-6">
          {/* Main Stadium Scoreboard HUD */}
          <div className="bg-gradient-to-r from-[#0A1628] to-[#112240] text-white p-6 rounded-2xl flex items-center justify-between shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]" />
            <div className="text-center flex-1 min-w-0 z-10">
              <h3 className="font-extrabold text-sm sm:text-lg truncate tracking-wide text-slate-200">
                {teamA?.name || 'Team A'}
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Home Side</p>
            </div>
            <div className="flex items-center gap-6 px-4 flex-shrink-0 z-10">
              <div className="font-mono text-3xl sm:text-5xl font-black text-[#00D084] bg-slate-900/50 border border-slate-700/50 px-5 py-2 rounded-2xl shadow-inner min-w-[70px] text-center">
                {scoreA}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-[#00D084] tracking-widest bg-[#00D084]/15 px-2 py-0.5 rounded-full">
                  SHOOTOUT
                </span>
                <span className="text-xs font-bold text-gray-400 mt-1">VS</span>
              </div>
              <div className="font-mono text-3xl sm:text-5xl font-black text-[#00D084] bg-slate-900/50 border border-slate-700/50 px-5 py-2 rounded-2xl shadow-inner min-w-[70px] text-center">
                {scoreB}
              </div>
            </div>
            <div className="text-center flex-1 min-w-0 z-10">
              <h3 className="font-extrabold text-sm sm:text-lg truncate tracking-wide text-slate-200">
                {teamB?.name || 'Team B'}
              </h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Away Side</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-medium flex items-center gap-2 animate-pulse">
              <ShieldAlert size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Side-by-Side Roster Interactive Click Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A Roster List */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  {teamA?.name} Squad
                </h4>
                <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-0.5 rounded-full">
                  {playersA.length} Players
                </span>
              </div>
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1 flex-1">
                {playersA.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center italic">No players registered.</p>
                ) : (
                  playersA.map((p) => {
                    const kickCount = kicksA.filter((k) => k.playerId === p.id).length;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl transition-all"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-slate-800 truncate">{p.name}</span>
                          {p.role && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {p.role}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {kickCount > 0 && (
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full">
                              Kicked {kickCount}x
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePlayerTap('A', p.id, 'scored')}
                            className="bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                            title="Log penalty scored by this player"
                          >
                            ⚽ Scored
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlayerTap('A', p.id, 'missed')}
                            className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                            title="Log penalty missed by this player"
                          >
                            ❌ Missed
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team B Roster List */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  {teamB?.name} Squad
                </h4>
                <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-2 py-0.5 rounded-full">
                  {playersB.length} Players
                </span>
              </div>
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1 flex-1">
                {playersB.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center italic">No players registered.</p>
                ) : (
                  playersB.map((p) => {
                    const kickCount = kicksB.filter((k) => k.playerId === p.id).length;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl transition-all"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-slate-800 truncate">{p.name}</span>
                          {p.role && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {p.role}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {kickCount > 0 && (
                            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full">
                              Kicked {kickCount}x
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePlayerTap('B', p.id, 'scored')}
                            className="bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                            title="Log penalty scored by this player"
                          >
                            ⚽ Scored
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlayerTap('B', p.id, 'missed')}
                            className="bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                            title="Log penalty missed by this player"
                          >
                            ❌ Missed
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sequential Kicks Log Scorecard */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#00D084]" />
                Penalty Kick Sequence Log
              </h3>
              <button
                onClick={handleResetAllKicks}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                type="button"
              >
                <RotateCcw size={12} />
                Reset Shootout
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {kicksA.map((kickAItem, idx) => {
                const kickBItem = kicksB[idx] || { playerId: '', result: null };
                const playerAObj = playersA.find((p) => p.id === kickAItem.playerId);
                const playerBObj = playersB.find((p) => p.id === kickBItem.playerId);

                return (
                  <div
                    key={idx}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    {/* Left Kicker */}
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400 w-12 flex-shrink-0">
                        {idx + 1}. A
                      </span>
                      <div className="flex-1 min-w-0">
                        {kickAItem.result ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                kickAItem.result === 'scored' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            >
                              {kickAItem.result === 'scored' ? '✓' : '✗'}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {playerAObj?.name || 'Unknown Kicker'}
                            </span>
                            <button
                              type="button"
                              onClick={() => clearKickSlot('A', idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                              title="Clear kick result"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex-shrink-0" />
                            <select
                              value={kickAItem.playerId}
                              onChange={(e) => updateKickResult('A', idx, 'playerId', e.target.value)}
                              className="border border-gray-200 rounded-md p-1 text-[11px] outline-none text-slate-500 bg-white"
                            >
                              <option value="">-- Assign Kicker --</option>
                              {playersA.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-400 italic">Waiting...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VS divider */}
                    <div className="text-xs text-slate-400 font-bold hidden sm:block">vs</div>

                    {/* Right Kicker */}
                    <div className="flex-1 flex items-center gap-3 justify-end sm:justify-start">
                      <span className="text-xs font-black text-slate-400 w-12 flex-shrink-0 sm:hidden">
                        {idx + 1}. B
                      </span>
                      <div className="flex-1 min-w-0 text-right sm:text-left">
                        {kickBItem.result ? (
                          <div className="flex items-center gap-2 justify-end sm:justify-start">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                kickBItem.result === 'scored' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            >
                              {kickBItem.result === 'scored' ? '✓' : '✗'}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {playerBObj?.name || 'Unknown Kicker'}
                            </span>
                            <button
                              type="button"
                              onClick={() => clearKickSlot('B', idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                              title="Clear kick result"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 justify-end sm:justify-start">
                            <span className="w-5 h-5 rounded-full border border-dashed border-gray-300 flex-shrink-0" />
                            <select
                              value={kickBItem.playerId}
                              onChange={(e) => updateKickResult('B', idx, 'playerId', e.target.value)}
                              className="border border-gray-200 rounded-md p-1 text-[11px] outline-none text-slate-500 bg-white"
                            >
                              <option value="">-- Assign Kicker --</option>
                              {playersB.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-400 italic">Waiting...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sudden Death Trigger & Save Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-gray-200 rounded-2xl p-4 mt-4">
              <div>
                {allKicksTaken && isTied ? (
                  <button
                    type="button"
                    onClick={handleAddSuddenDeath}
                    className="inline-flex items-center gap-1.5 bg-[#0A1628] hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    + Add Sudden Death Kick Row
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold">
                    {isTied
                      ? 'Scores are currently tied. Log all kicks to activate Sudden Death.'
                      : 'Shootout has a designated winner.'}
                  </span>
                )}
              </div>

              <div className="flex gap-3 w-full sm:w-auto">
                {kicksA.length > 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setKicksA(kicksA.slice(0, -1));
                      setKicksB(kicksB.slice(0, -1));
                    }}
                    className="flex-1 sm:flex-initial bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Remove Sudden Death Row
                  </button>
                )}

                <button
                  type="button"
                  disabled={saving || scoreA === scoreB}
                  onClick={handleSaveShootout}
                  className="flex-1 sm:flex-initial bg-[#00D084] hover:bg-[#00B871] text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-[#00D084]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  Save Shootout Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
