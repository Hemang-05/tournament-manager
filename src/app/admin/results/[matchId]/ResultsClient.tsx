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
  const [currentMinute, setCurrentMinute] = useState('1');

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventPlayerId, setEventPlayerId] = useState('');
  const [eventType, setEventType] = useState('Goal');
  const [eventMinute, setEventMinute] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSaveResult = async () => {
    setSavingResult(true);
    try {
      const { error: saveErr } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status,
        motm_player_id: null
      }).eq('id', match.id);

      if (saveErr) throw saveErr;

      // Advancing knockout stage winners
      if (status?.toLowerCase() === 'completed') {
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

  const handleFinishMatch = async () => {
    const confirmFinish = window.confirm("Are you sure you want to finish the match? This will finalize the scores and advance bracket stages.");
    if (!confirmFinish) return;

    setSavingResult(true);
    try {
      const { error: saveErr } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        status: 'completed',
        motm_player_id: null
      }).eq('id', match.id);

      if (saveErr) throw saveErr;

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

      alert('Match successfully finished and saved!');
      router.push('/admin/fixtures');
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
      const min = parseInt(currentMinute) || 1;
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
    if (!eventPlayerId || !eventMinute) return;
    
    setAddingEvent(true);
    try {
      const min = parseInt(eventMinute) || 1;
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
        setEventMinute('');
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
          event_type: event.event_type,
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
            
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                value={homeScore} 
                onChange={e => setHomeScore(parseInt(e.target.value) || 0)}
                className="w-16 h-20 text-4xl font-bold text-center bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:border-[#00D084]"
              />
              <span className="text-2xl font-bold text-gray-500">-</span>
              <input 
                type="number" 
                value={awayScore} 
                onChange={e => setAwayScore(parseInt(e.target.value) || 0)}
                className="w-16 h-20 text-4xl font-bold text-center bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:border-[#00D084]"
              />
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
        <div className="bg-slate-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-extrabold text-[#0A1628]" style={{ fontFamily: 'Georgia, serif' }}>Live Player Statistics Logger</h3>
            <p className="text-xs text-gray-500">Tap + to add a goal or select cards for any player on either team.</p>
          </div>
          
          {/* Minute Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Event Minute:</span>
            <input
              type="number"
              min="1"
              max="120"
              value={currentMinute}
              onChange={(e) => setCurrentMinute(e.target.value)}
              className="w-16 px-2.5 py-1 border border-gray-300 rounded-lg text-sm text-center outline-none focus:border-[#00D084]"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Home Team Players */}
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                {match.home_team.name}
              </h4>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">
                Home Team
              </span>
            </div>
            
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {players
                .filter((p: any) => p.team_id === match.home_team_id)
                .map((p: any) => {
                  const matchGoals = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'goal').length;
                  const matchYellows = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'yellow card').length;
                  const matchReds = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'red card').length;
                  
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
            </div>
          </div>

          {/* Away Team Players */}
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                {match.away_team.name}
              </h4>
              <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">
                Away Team
              </span>
            </div>
            
            <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
              {players
                .filter((p: any) => p.team_id === match.away_team_id)
                .map((p: any) => {
                  const matchGoals = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'goal').length;
                  const matchYellows = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'yellow card').length;
                  const matchReds = events.filter((e: any) => e.player_id === p.id && e.event_type.toLowerCase() === 'red card').length;
                  
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
                <input required type="number" min="1" max="120" placeholder="Minute" value={eventMinute} onChange={e => setEventMinute(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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
                  <div className="w-8 text-center font-bold text-gray-400 text-sm">{e.minute}'</div>
                  <div className="flex-1 font-medium text-sm text-gray-900">{e.player?.name}</div>
                  <div className="text-sm text-gray-600 w-24 text-right">
                    {e.event_type === 'Yellow Card' ? '🟨 Card' : 
                     e.event_type === 'Red Card' ? '🟥 Card' : 
                     e.event_type === 'Goal' ? '⚽ Goal' : 
                     e.event_type === 'Own Goal' ? '🤦‍♂️ OG' : '👟 Assist'}
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
    </div>
  );
}
