'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Wand2, Loader2, Save } from 'lucide-react';

export default function ResultsClient({ initialMatch, initialEvents, players }: any) {
  const [match, setMatch] = useState(initialMatch);
  const [events, setEvents] = useState<any[]>(initialEvents);
  
  const [homeScore, setHomeScore] = useState(match.home_score || 0);
  const [awayScore, setAwayScore] = useState(match.away_score || 0);
  const [status, setStatus] = useState(match.status);
  const [motmId, setMotmId] = useState(match.motm_player_id || '');
  
  const [savingResult, setSavingResult] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [report, setReport] = useState(match.ai_report || '');

  const [loggingEventId, setLoggingEventId] = useState<string | null>(null);
  const [showMotmModal, setShowMotmModal] = useState(false);
  const [selectedMotmId, setSelectedMotmId] = useState<string | null>(null);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventPlayerId, setEventPlayerId] = useState('');
  const [eventType, setEventType] = useState('Goal');
  const [addingEvent, setAddingEvent] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'home' | 'away'>('home');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const getNormalizedType = (typeVal: any) => {
    return (typeVal || '').toLowerCase().replace(/_/g, ' ');
  };

  const handleSaveResult = async () => {
    setSavingResult(true);
    try {
      const { error: saveErr } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status,
        motm_player_id: motmId || null
      }).eq('id', match.id);

      if (saveErr) throw saveErr;

      // Advancing knockout stage winners
      if (status?.toLowerCase() === 'completed') {
        const isDraw = Number(homeScore) === Number(awayScore);
        if (isDraw) {
          alert('Match saved as completed draw. Redirecting to penalties to record the shootout.');
          router.push(`/admin/penalties?matchId=${match.id}`);
          router.refresh();
          return;
        }

        const isKnockout = match.stage && (
          match.stage.startsWith('Round of 16') ||
          match.stage.startsWith('Quarter-final') ||
          match.stage.startsWith('Semi-final') ||
          match.stage.startsWith('Final')
        );

        if (isKnockout) {
          const winnerId = Number(homeScore) > Number(awayScore) 
            ? match.home_team_id 
            : Number(awayScore) > Number(homeScore)
            ? match.away_team_id
            : null;
          
          if (winnerId) {
            const { advanceKnockoutWinner } = await import('@/lib/bracket');
            await advanceKnockoutWinner(supabase, match.tournament_id, match.stage, winnerId);
          }
        } else {
          const { resolveGroupPlayoffs } = await import('@/lib/bracket');
          await resolveGroupPlayoffs(supabase, match.tournament_id);
        }
      }
      
      alert('Match result saved successfully');
      router.refresh();
    } catch (err: any) {
      alert(`Error saving result: ${err.message}`);
    } finally {
      setSavingResult(false);
    }
  };

  const handleFinishMatch = () => {
    // Determine winning team and pre-select the MOTM from top goal scorers of the winning team
    const winningTeamId = homeScore > awayScore ? match.home_team_id : awayScore > homeScore ? match.away_team_id : null;
    const sorted = [...players].map(p => {
      const goalsInMatch = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'goal').length;
      const isWinner = winningTeamId ? p.team_id === winningTeamId : false;
      return { ...p, goalsInMatch, isWinner };
    }).sort((a, b) => {
      if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
      if (b.goalsInMatch !== a.goalsInMatch) return b.goalsInMatch - a.goalsInMatch;
      return a.name.localeCompare(b.name);
    });

    if (sorted.length > 0) {
      setSelectedMotmId(sorted[0].id);
    } else {
      setSelectedMotmId(null);
    }
    setShowMotmModal(true);
  };

  const submitFinishMatch = async (motmPlayerId: string | null) => {
    setSavingResult(true);
    setShowMotmModal(false);
    try {
      const { error: saveErr } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'completed',
        motm_player_id: motmPlayerId
      }).eq('id', match.id);

      if (saveErr) throw saveErr;

      const isDraw = Number(homeScore) === Number(awayScore);
      if (isDraw) {
        alert('Match regular time finished as a draw. Redirecting to penalties to record the shootout.');
        router.push(`/admin/penalties?matchId=${match.id}`);
        router.refresh();
        return;
      }

      // Advancing knockout stage winners / group stages
      const isKnockout = match.stage && (
        match.stage.startsWith('Round of 16') ||
        match.stage.startsWith('Quarter-final') ||
        match.stage.startsWith('Semi-final') ||
        match.stage.startsWith('Final')
      );

      if (isKnockout) {
        const winnerId = Number(homeScore) > Number(awayScore) 
          ? match.home_team_id 
          : Number(awayScore) > Number(homeScore)
          ? match.away_team_id
          : null;
        
        if (winnerId) {
          const { advanceKnockoutWinner } = await import('@/lib/bracket');
          await advanceKnockoutWinner(supabase, match.tournament_id, match.stage, winnerId);
        }
      } else {
        const { resolveGroupPlayoffs } = await import('@/lib/bracket');
        await resolveGroupPlayoffs(supabase, match.tournament_id);
      }

      alert('Match successfully finished, MOTM saved, and bracket advanced!');
      router.push('/admin/results');
      router.refresh();
    } catch (err: any) {
      alert(`Error finishing match: ${err.message}`);
    } finally {
      setSavingResult(false);
    }
  };

  const handleLogEvent = async (playerId: string, eventType: string, teamId: string) => {
    setLoggingEventId(playerId + '-' + eventType);
    try {
      const min = 1;
      const res = await fetch(`/api/matches/${match.id}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          event_type: eventType,
          minute: min,
          team_id: teamId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to log event');
      }

      const data = await res.json();
      if (data.event) {
        const playerObj = players.find((p: any) => p.id === playerId);
        const newEvent = {
          ...data.event,
          player: { name: playerObj?.name || 'Unknown' }
        };
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.minute - b.minute));
      }
      
      if (data.match) {
        setHomeScore(data.match.home_score || 0);
        setAwayScore(data.match.away_score || 0);
      }
      
      router.refresh();
    } catch (err: any) {
      alert(`Error logging event: ${err.message}`);
    } finally {
      setLoggingEventId(null);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventPlayerId) return;
    
    setAddingEvent(true);
    try {
      const min = 1;
      const playerObj = players.find((p: any) => p.id === eventPlayerId);
      const res = await fetch(`/api/matches/${match.id}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: eventPlayerId,
          event_type: eventType,
          minute: min,
          team_id: playerObj?.team_id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add event');
      }

      const data = await res.json();
      if (data.event) {
        const newEvent = {
          ...data.event,
          player: { name: playerObj?.name || 'Unknown' }
        };
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.minute - b.minute));
        setShowEventForm(false);
        setEventPlayerId('');
        setEventType('Goal');
      }
      if (data.match) {
        setHomeScore(data.match.home_score || 0);
        setAwayScore(data.match.away_score || 0);
      }
      router.refresh();
    } catch (err: any) {
      alert(`Error adding event: ${err.message}`);
    } finally {
      setAddingEvent(false);
    }
  };

  const handleDeleteEvent = async (event: any) => {
    const confirmDelete = window.confirm("Are you sure you want to remove this event? Score and stats will be reversed.");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/matches/${match.id}/goal`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          player_id: event.player_id,
          event_type: event.type || event.event_type,
          team_id: event.player?.team_id || match.home_team_id
        })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete event');
      }

      const data = await res.json();
      setEvents(events.filter(e => e.id !== event.id));
      
      if (data.match) {
        setHomeScore(data.match.home_score || 0);
        setAwayScore(data.match.away_score || 0);
      }
      router.refresh();
    } catch (err: any) {
      alert(`Error deleting event: ${err.message}`);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/matches/${match.id}/report`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setReport(data.report);
        router.refresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Failed to generate report');
    }
    setGeneratingReport(false);
  };

  const getTeamName = (teamId: string) => {
    return teamId === match.home_team_id ? match.home_team.name : match.away_team.name;
  };

  const homeFallbackPlayer = players.find((p: any) => p.team_id === match.home_team_id);
  const awayFallbackPlayer = players.find((p: any) => p.team_id === match.away_team_id);

  return (
    <div className="space-y-8">
      {/* Match Header & Score */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-[#0A1628] p-6 text-white text-center">
          <div className="text-sm text-gray-400 font-medium mb-4">
            {new Date(match.match_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex justify-center items-center gap-8">
            <div className="flex flex-col items-center gap-2 w-32">
              <div className="w-16 h-16 bg-white rounded-full p-1">
                {match.home_team.logo_url ? <img src={match.home_team.logo_url} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-gray-200 rounded-full" />}
              </div>
              <span className="font-bold text-lg text-center leading-tight">{match.home_team.name}</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-20 text-4xl font-bold text-center bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all"
                />
                <span className="text-2xl font-bold text-gray-500 select-none">-</span>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 h-20 text-4xl font-bold text-center bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all"
                />
              </div>
              {match.home_penalty_score !== null && match.home_penalty_score !== undefined &&
               match.away_penalty_score !== null && match.away_penalty_score !== undefined && (
                <div className="text-xs font-bold text-emerald-400 font-mono bg-white/10 px-2 py-0.5 rounded border border-white/20 mt-1">
                  Pen {match.home_penalty_score} - {match.away_penalty_score}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-2 w-32">
              <div className="w-16 h-16 bg-white rounded-full p-1">
                {match.away_team.logo_url ? <img src={match.away_team.logo_url} className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-gray-200 rounded-full" />}
              </div>
              <span className="font-bold text-lg text-center leading-tight">{match.away_team.name}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={status?.toLowerCase()} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handleSaveResult}
              disabled={savingResult}
              className="w-full md:w-auto bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              {savingResult ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Score
            </button>
            <button 
              onClick={handleFinishMatch}
              disabled={savingResult}
              className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm shadow-sm"
            >
              Finish Match
            </button>
          </div>
        </div>
      </div>

      {/* Team-by-Team Live Player Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-gray-200 p-4">
          <h3 className="font-extrabold text-[#0A1628]" style={{ fontFamily: 'Georgia, serif' }}>Live Player Statistics Logger</h3>
          <p className="text-xs text-gray-500 mt-1">Tap + to add a goal or select cards for any player on either team.</p>
        </div>

        {/* Mobile Tab Selectors */}
        <div className="flex md:hidden border-b border-gray-200 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveMobileTab('home')}
            className={`flex-1 py-3 text-center text-xs font-bold border-b-2 uppercase tracking-wider transition-all ${
              activeMobileTab === 'home'
                ? 'border-[#00D084] text-[#00D084] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            {match.home_team.name}
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('away')}
            className={`flex-1 py-3 text-center text-xs font-bold border-b-2 uppercase tracking-wider transition-all ${
              activeMobileTab === 'away'
                ? 'border-[#00D084] text-[#00D084] bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
            }`}
          >
            {match.away_team.name}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Home Team Players */}
          <div className={`p-4 md:p-6 space-y-4 ${activeMobileTab === 'home' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {match.home_team.name}
              </h4>
            </div>
            
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {players
                .filter((p: any) => p.team_id === match.home_team_id)
                .map((p: any) => {
                  const matchGoals = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'goal').length;
                  const matchYellows = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'yellow card').length;
                  const matchReds = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'red card').length;
                  
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 rounded-lg">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLogEvent(p.id, 'Goal', p.team_id)}
                          disabled={loggingEventId !== null}
                          className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold hover:bg-green-600 transition-colors shadow-sm focus:outline-none"
                          title="Add Goal"
                        >
                          +
                        </button>
                        <span className="font-bold text-sm text-gray-800">{p.name}</span>
                        {p.role === 'captain' && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">C</span>}
                        {p.role === 'goalkeeper' && <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">GK</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Match specific stats badges */}
                        {matchGoals > 0 && (
                          <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            ⚽ {matchGoals}
                          </span>
                        )}
                        {matchYellows > 0 && (
                          <span className="text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            🟨 {matchYellows}
                          </span>
                        )}
                        {matchReds > 0 && (
                          <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            🟥 {matchReds}
                          </span>
                        )}
                        
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleLogEvent(p.id, e.target.value, p.team_id);
                              e.target.value = ""; // Reset
                            }
                          }}
                          disabled={loggingEventId !== null}
                          className="bg-gray-50 border border-gray-200 rounded text-xs px-1.5 py-1 focus:outline-none focus:border-[#00D084]"
                        >
                          <option value="">Card...</option>
                          <option value="Yellow Card">🟨 Yellow Card</option>
                          <option value="Red Card">🟥 Red Card</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              
              {/* Home Team Own Goal Row */}
              {homeFallbackPlayer && (
                <div className="flex items-center justify-between p-2.5 bg-red-50/20 hover:bg-red-50/40 border border-dashed border-red-200 mt-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLogEvent(homeFallbackPlayer.id, 'Own Goal', match.home_team_id)}
                      disabled={loggingEventId !== null}
                      className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold transition-all shadow-sm focus:outline-none hover:scale-105 active:scale-95"
                      title="Add Own Goal (Increments Opponent Score)"
                    >
                      +
                    </button>
                    <span className="font-bold text-sm text-red-600 italic">Own Goal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {events.filter((e: any) => e.player_id === homeFallbackPlayer.id && getNormalizedType(e.type || e.event_type) === 'own goal').length > 0 && (
                      <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        🤦‍♂️ {events.filter((e: any) => e.player_id === homeFallbackPlayer.id && getNormalizedType(e.type || e.event_type) === 'own goal').length}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Away Team Players */}
          <div className={`p-4 md:p-6 space-y-4 ${activeMobileTab === 'away' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                {match.away_team.name}
              </h4>
            </div>
            
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {players
                .filter((p: any) => p.team_id === match.away_team_id)
                .map((p: any) => {
                  const matchGoals = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'goal').length;
                  const matchYellows = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'yellow card').length;
                  const matchReds = events.filter((e: any) => e.player_id === p.id && getNormalizedType(e.type || e.event_type) === 'red card').length;
                  
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 rounded-lg">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLogEvent(p.id, 'Goal', p.team_id)}
                          disabled={loggingEventId !== null}
                          className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold hover:bg-green-600 transition-colors shadow-sm focus:outline-none"
                          title="Add Goal"
                        >
                          +
                        </button>
                        <span className="font-bold text-sm text-gray-800">{p.name}</span>
                        {p.role === 'captain' && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">C</span>}
                        {p.role === 'goalkeeper' && <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">GK</span>}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Match specific stats badges */}
                        {matchGoals > 0 && (
                          <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            ⚽ {matchGoals}
                          </span>
                        )}
                        {matchYellows > 0 && (
                          <span className="text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            🟨 {matchYellows}
                          </span>
                        )}
                        {matchReds > 0 && (
                          <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            🟥 {matchReds}
                          </span>
                        )}
                        
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleLogEvent(p.id, e.target.value, p.team_id);
                              e.target.value = ""; // Reset
                            }
                          }}
                          disabled={loggingEventId !== null}
                          className="bg-gray-50 border border-gray-200 rounded text-xs px-1.5 py-1 focus:outline-none focus:border-[#00D084]"
                        >
                          <option value="">Card...</option>
                          <option value="Yellow Card">🟨 Yellow Card</option>
                          <option value="Red Card">🟥 Red Card</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              
              {/* Away Team Own Goal Row */}
              {awayFallbackPlayer && (
                <div className="flex items-center justify-between p-2.5 bg-red-50/20 hover:bg-red-50/40 border border-dashed border-red-200 mt-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLogEvent(awayFallbackPlayer.id, 'Own Goal', match.away_team_id)}
                      disabled={loggingEventId !== null}
                      className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold transition-all shadow-sm focus:outline-none hover:scale-105 active:scale-95"
                      title="Add Own Goal (Increments Opponent Score)"
                    >
                      +
                    </button>
                    <span className="font-bold text-sm text-red-600 italic">Own Goal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {events.filter((e: any) => e.player_id === awayFallbackPlayer.id && getNormalizedType(e.type || e.event_type) === 'own goal').length > 0 && (
                      <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        🤦‍♂️ {events.filter((e: any) => e.player_id === awayFallbackPlayer.id && getNormalizedType(e.type || e.event_type) === 'own goal').length}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Match Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-900">Match Events</h3>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="text-sm font-medium text-[#00D084] hover:text-[#00B875] flex items-center gap-1"
            >
              <Plus size={16} /> Add Event
            </button>
          </div>
          
          {showEventForm && (
            <form onSubmit={handleAddEvent} className="p-4 border-b border-gray-200 bg-blue-50/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select required value={eventPlayerId} onChange={e => setEventPlayerId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                  <option value="">Select Player</option>
                  {players.map((p:any) => <option key={p.id} value={p.id}>{p.name} ({getTeamName(p.team_id)})</option>)}
                </select>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm">
                  <option value="Goal">Goal</option>
                  <option value="Assist">Assist</option>
                  <option value="Yellow Card">Yellow Card</option>
                  <option value="Red Card">Red Card</option>
                  <option value="Own Goal">Own Goal</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={addingEvent} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                  {addingEvent ? <Loader2 size={16} className="animate-spin" /> : 'Add'}
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {events.length > 0 ? (
              events.map((e:any) => (
                <div key={e.id} className="p-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 font-medium text-sm text-gray-900">
                    {getNormalizedType(e.type || e.event_type) === 'own goal' ? 'OG' : (e.player?.name || 'Unknown')}
                  </div>
                  <div className="text-sm text-gray-600 w-24 text-right">
                    {getNormalizedType(e.type || e.event_type) === 'yellow card' ? '🟨 Card' : 
                     getNormalizedType(e.type || e.event_type) === 'red card' ? '🟥 Card' : 
                     getNormalizedType(e.type || e.event_type) === 'goal' ? '⚽ Goal' : 
                     getNormalizedType(e.type || e.event_type) === 'own goal' ? '🤦‍♂️ OG' : '👟 Assist'}
                  </div>
                  <button onClick={() => handleDeleteEvent(e)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">No events logged yet.</div>
            )}
          </div>
        </div>

        {/* AI Match Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-purple-50">
            <div className="flex items-center gap-2 text-purple-900 font-bold">
              <Wand2 size={18} /> AI Match Report
            </div>
            <button 
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {generatingReport ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : report ? 'Regenerate' : 'Generate'}
            </button>
          </div>
          
          <div className="p-6 flex-1 bg-gray-50">
            {report ? (
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {report}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Wand2 size={48} className="text-purple-200 mb-4" />
                <p className="text-gray-500 text-sm">Generate an AI match report based on the score and events logged.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Man of the Match Picker Modal */}
      {showMotmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-100 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#0A1628] to-[#1E3A5F] text-white">
              <h2 className="text-xl font-bold font-serif">Select Man of the Match</h2>
              <p className="text-xs text-gray-300 mt-1">
                {homeScore > awayScore || awayScore > homeScore 
                  ? `Winner: ${homeScore > awayScore ? match.home_team.name : match.away_team.name}. Prioritizing their top goal scorers.`
                  : "Match ended in a draw. Prioritizing top goal scorers."
                }
              </p>
            </div>

            {/* Modal Content - Scrollable Player List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
              {(() => {
                const winningTeamId = homeScore > awayScore ? match.home_team_id : awayScore > homeScore ? match.away_team_id : null;
                const sorted = [...players].map(p => {
                  const goalsInMatch = events.filter((e: any) => e.player_id === p.id && (e.type || e.event_type)?.toLowerCase() === 'goal').length;
                  const isWinner = winningTeamId ? p.team_id === winningTeamId : false;
                  return { ...p, goalsInMatch, isWinner };
                }).sort((a, b) => {
                  if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
                  if (b.goalsInMatch !== a.goalsInMatch) return b.goalsInMatch - a.goalsInMatch;
                  return a.name.localeCompare(b.name);
                });

                return sorted.length > 0 ? (
                  sorted.map((p) => {
                    const isSelected = selectedMotmId === p.id;
                    const teamName = p.team_id === match.home_team_id ? match.home_team.name : match.away_team.name;
                    
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedMotmId(p.id)}
                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-[#00D084] bg-white ring-2 ring-[#00D084]/20 shadow-md scale-[1.01]'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            p.isWinner ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              {p.name}
                              {p.role === 'captain' && <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">C</span>}
                              {p.role === 'goalkeeper' && <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1 rounded">GK</span>}
                            </div>
                            <div className="text-[11px] text-gray-400 font-semibold flex items-center gap-1.5">
                              {teamName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {p.goalsInMatch > 0 && (
                            <span className="bg-green-50 border border-green-200 text-green-700 text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              ⚽ {p.goalsInMatch} Goals
                            </span>
                          )}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-[#00D084] bg-[#00D084] text-white' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && (
                              <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-gray-500 text-sm">No players found.</div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-white flex flex-col sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMotmModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors order-3 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitFinishMatch(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors order-2"
              >
                Skip MOTM
              </button>
              <button
                type="button"
                onClick={() => submitFinishMatch(selectedMotmId)}
                disabled={!selectedMotmId}
                className="px-5 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#00D084]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:shadow-none order-1 sm:order-3"
              >
                Confirm & Finish
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
