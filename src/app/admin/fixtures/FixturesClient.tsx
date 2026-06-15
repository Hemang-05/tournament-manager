'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  Wand2,
  Plus,
  Edit,
  Calendar,
  Grid,
  List,
  Loader2,
  CheckCircle,
  HelpCircle,
  Shuffle,
  AlertCircle,
  Play
} from 'lucide-react';

export default function FixturesClient({ tournament, teamsCount, initialMatches, teams }: any) {
  const [matches, setMatches] = useState<any[]>(initialMatches);
  const [generating, setGenerating] = useState(false);
  const [generatedFixtures, setGeneratedFixtures] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup Wizard State
  const [selectedFormat, setSelectedFormat] = useState<'league' | 'knockout' | 'league_knockout'>('league');
  const [startTime, setStartTime] = useState(tournament.daily_start_time || '09:00');
  const [endTime, setEndTime] = useState(tournament.daily_end_time || '18:00');
  const [matchDuration, setMatchDuration] = useState(tournament.match_duration || 20);
  const [numGroups, setNumGroups] = useState<2 | 4>(2);
  const [advancementCount, setAdvancementCount] = useState<1 | 2>(2);
  const [teamGroupAssignments, setTeamGroupAssignments] = useState<Record<string, string>>({});
  
  // View Toggle
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('Scheduled');
  const [stage, setStage] = useState('League');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Initial group assignments when component loads
  useEffect(() => {
    const initialGroups: Record<string, string> = {};
    teams.forEach((t: any) => {
      if (t.group_name) {
        initialGroups[t.id] = t.group_name;
      }
    });
    setTeamGroupAssignments(initialGroups);
  }, [teams]);

  // Random group allocator
  const randomizeGroups = () => {
    const groupNames = numGroups === 2 ? ['Group A', 'Group B'] : ['Group A', 'Group B', 'Group C', 'Group D'];
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const newAssignments: Record<string, string> = {};

    shuffledTeams.forEach((team, index) => {
      const assignedGroup = groupNames[index % groupNames.length];
      newAssignments[team.id] = assignedGroup;
    });

    setTeamGroupAssignments(newAssignments);
  };

  // Generate with Server API
  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      // Validation for group assignment if league_knockout
      if (selectedFormat === 'league_knockout') {
        const unassigned = teams.filter((t: any) => !teamGroupAssignments[t.id]);
        if (unassigned.length > 0) {
          throw new Error('Please assign all teams to a group before generating fixtures.');
        }
      }

      const res = await fetch('/api/fixtures/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id,
          format: selectedFormat,
          groups: selectedFormat === 'league_knockout' ? teamGroupAssignments : null,
          advancementCount,
          startTime,
          endTime,
          matchDuration
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setGeneratedFixtures(data.fixtures);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/fixtures/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id,
          format: selectedFormat,
          groups: selectedFormat === 'league_knockout' ? teamGroupAssignments : null,
          fixtures: generatedFixtures
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save fixtures');

      setSuccess('Fixtures saved successfully!');
      setGeneratedFixtures(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const openModal = (match: any = null) => {
    setEditingMatch(match);
    setHomeTeam(match?.home_team_id || '');
    setAwayTeam(match?.away_team_id || '');
    setDate(match?.match_date ? match.match_date : '');
    setTime(match?.kick_off_time || '');
    setStatus(match?.status || 'Scheduled');
    setStage(match?.stage || 'League');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMatch(null);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    
    try {
      if (editingMatch) {
        const { error: updErr } = await supabase
          .from('matches')
          .update({
            home_team_id: homeTeam || null,
            away_team_id: awayTeam || null,
            match_date: date,
            kick_off_time: time,
            status,
            stage
          })
          .eq('id', editingMatch.id);
        
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('matches')
          .insert({
            tournament_id: tournament.id,
            home_team_id: homeTeam || null,
            away_team_id: awayTeam || null,
            match_date: date,
            kick_off_time: time,
            status,
            stage,
            matchday: 1
          });
          
        if (insErr) throw insErr;
      }
      router.refresh();
      closeModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartMatch = async (match: any) => {
    // Check if the match is scheduled in the future
    if (match.match_date) {
      const todayStr = new Date().toISOString().split('T')[0];
      const matchDateStr = match.match_date;
      
      let isFuture = false;
      let matchDateTimeStr = '';
      
      if (match.kick_off_time) {
        matchDateTimeStr = `${matchDateStr}T${match.kick_off_time}`;
        const matchDateTime = new Date(matchDateTimeStr);
        const now = new Date();
        isFuture = matchDateTime > now;
      } else {
        isFuture = matchDateStr > todayStr;
      }

      if (isFuture) {
        const timeDisplay = match.kick_off_time ? ` at ${match.kick_off_time.slice(0, 5)}` : '';
        const confirmStart = window.confirm(
          `This match is scheduled for ${match.match_date}${timeDisplay}. Do you want to start it before the scheduled time?`
        );
        if (!confirmStart) {
          return; // cancel
        }
      }
    }

    try {
      setGenerating(true);
      setError('');
      
      const { error: patchError } = await supabase
        .from('matches')
        .update({
          status: 'live'
        })
        .eq('id', match.id);

      if (patchError) throw patchError;
      
      router.refresh();
      router.push(`/admin/results/${match.id}`);
    } catch (err: any) {
      setError(`Failed to start match: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Drag and Drop rescheduling in calendar view
  const handleDragStart = (e: React.DragEvent, matchId: string) => {
    e.dataTransfer.setData('text/plain', matchId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMatchDrop = async (e: React.DragEvent, targetDate: string, targetTime: string) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData('text/plain');
    if (!matchId) return;

    // Optimistically update the UI immediately
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, match_date: targetDate, kick_off_time: targetTime } : m));

    try {
      const { error: patchError } = await supabase
        .from('matches')
        .update({
          match_date: targetDate,
          kick_off_time: targetTime
        })
        .eq('id', matchId);

      if (patchError) throw patchError;
      router.refresh();
    } catch (err: any) {
      setError(`Failed to reschedule: ${err.message}`);
      // Revert optimization on error
      router.refresh();
    }
  };

  // Helper: Get unique sorted list of match dates to show as columns in calendar
  const getCalendarDates = () => {
    const dates = new Set<string>();
    matches.forEach(m => {
      if (m.match_date) dates.add(m.match_date);
    });

    if (dates.size === 0) {
      // Default to tournament start/end range or a week
      const start = tournament.start_date ? new Date(tournament.start_date) : new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.add(d.toISOString().split('T')[0]);
      }
    }
    return Array.from(dates).sort();
  };

  // Calendar Rows: Dynamic Timeslots fetched from matches
  const getCalendarTimeSlots = () => {
    const slots = new Set<string>();
    matches.forEach(m => {
      if (m.kick_off_time) {
        slots.add(m.kick_off_time.slice(0, 5));
      }
    });
    if (slots.size === 0) {
      return ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
    }
    return Array.from(slots).sort();
  };
  const timeSlots = getCalendarTimeSlots();

  const groupMatchesByMatchday = (matchList: any[]) => {
    const groups: Record<string, any[]> = {};
    matchList.forEach(m => {
      const stageName = m.stage || 'League';
      if (!groups[stageName]) groups[stageName] = [];
      groups[stageName].push(m);
    });
    return groups;
  };

  // HTML5 Drag and Drop Handlers for Group Creator
  const handleTeamDragStart = (e: React.DragEvent, teamId: string) => {
    e.dataTransfer.setData('teamId', teamId);
  };

  const handleGroupDrop = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    const teamId = e.dataTransfer.getData('teamId');
    if (!teamId) return;

    setTeamGroupAssignments(prev => ({
      ...prev,
      [teamId]: groupName
    }));
  };

  const groupList = numGroups === 2 ? ['Group A', 'Group B'] : ['Group A', 'Group B', 'Group C', 'Group D'];

  return (
    <div className="space-y-6">
      {/* Top Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" /> {success}
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Georgia, serif' }}>
            Fixtures & Scheduler
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage groups, generate schedules, and assign matches.</p>
        </div>

        {matches.length > 0 && !generatedFixtures && (
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="bg-gray-100 p-0.5 rounded-lg flex border border-gray-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <List size={14} /> List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Grid size={14} /> Grid Scheduler
              </button>
            </div>

            <button
              onClick={() => openModal()}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
            >
              <Plus size={16} /> Add Match
            </button>
          </div>
        )}
      </div>

      {/* Wizard: Generate Fixtures Setup (Shown only if no matches exist) */}
      {matches.length === 0 && !generatedFixtures && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm max-w-4xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto">
            <div className="w-14 h-14 bg-[#00D084]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#00D084]">
              <Wand2 size={28} />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Generate Match Fixtures</h2>
            <p className="text-sm text-gray-500 mt-1">Configure your tournament layout and let the scheduler structure matches instantly.</p>
          </div>

          {/* Step 1: Format Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-800">1. Select Tournament Format</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setSelectedFormat('league')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedFormat === 'league'
                    ? 'border-[#00D084] bg-[#00D084]/5 ring-2 ring-[#00D084]/30'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900">League Stage</div>
                <div className="text-xs text-gray-500 mt-1">Round-robin format where all teams play each other once.</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('knockout')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedFormat === 'knockout'
                    ? 'border-[#00D084] bg-[#00D084]/5 ring-2 ring-[#00D084]/30'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900">Direct Knockout</div>
                <div className="text-xs text-gray-500 mt-1">Single-elimination bracket starting from Quarter or Semi-finals.</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('league_knockout')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedFormat === 'league_knockout'
                    ? 'border-[#00D084] bg-[#00D084]/5 ring-2 ring-[#00D084]/30'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-bold text-gray-900">League + Knockout</div>
                <div className="text-xs text-gray-500 mt-1">Teams are split into pools/groups, top teams advance to playoffs.</div>
              </button>
            </div>
          </div>
          {/* Step 2: Scheduling Parameters */}
          <div className="space-y-4 pt-6 border-t border-gray-100 text-left">
            <label className="block text-sm font-bold text-gray-800">2. Configure Match Timing & Schedule</label>
            <p className="text-xs text-gray-500 -mt-2">Determine daily starting/ending hours and duration for each match. A 5-minute buffer is automatically included between matches.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Daily Start Time *</label>
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Daily End Time *</label>
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Match Duration (Minutes) *</label>
                <input
                  required
                  type="text"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={matchDuration || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setMatchDuration(val ? Number(val) : 0);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 bg-white text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Group Config & Assignment (If league_knockout is chosen) */}
          {selectedFormat === 'league_knockout' && (
            <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <label className="block text-sm font-bold text-gray-800">3. Configure Pools / Groups</label>
                  <p className="text-xs text-gray-500">Drag teams into groups, or click the randomize button to assign them automatically.</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Groups</label>
                    <select
                      value={numGroups}
                      onChange={e => setNumGroups(Number(e.target.value) as 2 | 4)}
                      className="bg-white border border-gray-300 rounded px-2.5 py-1 text-sm outline-none focus:border-[#00D084]"
                    >
                      <option value={2}>2 Groups (A-B)</option>
                      <option value={4}>4 Groups (A-D)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Advancing/Group</label>
                    <select
                      value={advancementCount}
                      onChange={e => setAdvancementCount(Number(e.target.value) as 1 | 2)}
                      className="bg-white border border-gray-300 rounded px-2.5 py-1 text-sm outline-none focus:border-[#00D084]"
                    >
                      <option value={1}>Top 1 Advances</option>
                      <option value={2}>Top 2 Advance</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={randomizeGroups}
                    className="mt-5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Shuffle size={14} /> Randomize
                  </button>
                </div>
              </div>

              {/* Group Drag-Drop Workspace */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Unassigned Teams list */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleGroupDrop(e, '')}
                  className="md:col-span-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 min-h-[200px] flex flex-col"
                >
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex justify-between items-center">
                    <span>Unassigned Teams</span>
                    <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-mono font-bold text-[10px]">
                      {teams.filter((t: any) => !teamGroupAssignments[t.id]).length}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[300px] pr-1">
                    {teams
                      .filter((t: any) => !teamGroupAssignments[t.id])
                      .map((t: any) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={e => handleTeamDragStart(e, t.id)}
                          className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm cursor-grab hover:border-gray-400 active:cursor-grabbing text-sm font-bold text-gray-800 flex items-center justify-between gap-2"
                        >
                          <span>{t.name}</span>
                          <select
                            value={teamGroupAssignments[t.id] || ''}
                            onChange={e => setTeamGroupAssignments(prev => ({ ...prev, [t.id]: e.target.value }))}
                            className="bg-gray-50 border border-gray-200 rounded text-[11px] p-0.5 font-medium outline-none focus:border-[#00D084]"
                          >
                            <option value="">Choose...</option>
                            {groupList.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Groups box grid */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupList.map(groupName => {
                    const groupTeams = teams.filter((t: any) => teamGroupAssignments[t.id] === groupName);
                    return (
                      <div
                        key={groupName}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleGroupDrop(e, groupName)}
                        className="bg-white border border-gray-200 rounded-xl p-4 min-h-[160px] hover:border-gray-300 transition-colors flex flex-col"
                      >
                        <h4 className="text-xs font-bold text-gray-900 mb-3 border-b border-gray-100 pb-1.5 flex justify-between items-center">
                          <span className="text-blue-600 font-bold">{groupName}</span>
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-mono font-bold text-[10px]">
                            {groupTeams.length}
                          </span>
                        </h4>
                        <div className="flex-1 flex flex-wrap gap-1.5 content-start">
                          {groupTeams.map((t: any) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={e => handleTeamDragStart(e, t.id)}
                              className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 shadow-xs flex items-center justify-between gap-2 cursor-grab"
                            >
                              <span>{t.name}</span>
                              <button
                                type="button"
                                onClick={() => setTeamGroupAssignments(prev => {
                                  const cpy = { ...prev };
                                  delete cpy[t.id];
                                  return cpy;
                                })}
                                className="text-gray-400 hover:text-red-500 text-xs font-bold"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                          {groupTeams.length === 0 && (
                            <div className="w-full flex items-center justify-center py-8 text-[11px] text-gray-400 font-medium">
                              Drag teams here
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={generating || teamsCount < 2}
              className="bg-[#00D084] hover:bg-[#00B875] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#00D084]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="animate-spin" size={18} /> Generating Schedule...</>
              ) : (
                <><Wand2 size={18} /> Generate Fixtures Schedule</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Preview AI Generated Fixtures */}
      {generatedFixtures && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>Preview Generated Fixtures</h3>
              <p className="text-xs text-gray-500">Review the schedule match list before saving to the database.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setGeneratedFixtures(null)}
                className="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Back / Cancel
              </button>
              <button
                onClick={handleSaveGenerated}
                disabled={generating}
                className="bg-[#00D084] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#00B875] transition-colors flex items-center gap-2"
              >
                {generating ? <Loader2 className="animate-spin" size={16} /> : 'Save Schedule'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="p-3.5 text-left font-semibold text-gray-600">Matchday</th>
                    <th className="p-3.5 text-left font-semibold text-gray-600">Stage</th>
                    <th className="p-3.5 text-left font-semibold text-gray-600">Date</th>
                    <th className="p-3.5 text-right font-semibold text-gray-600">Home</th>
                    <th className="p-3.5 text-center font-semibold text-gray-400"></th>
                    <th className="p-3.5 text-left font-semibold text-gray-600">Away</th>
                    <th className="p-3.5 text-left font-semibold text-gray-600">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {generatedFixtures.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-gray-900">MD {f.matchday}</td>
                      <td className="p-3"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold">{f.stage || 'League'}</span></td>
                      <td className="p-3 text-gray-600 font-mono">{f.match_date}</td>
                      <td className="p-3 text-right font-bold text-gray-800">{teams.find((t: any) => t.id === f.home_team_id)?.name || f.home_team_id || 'TBD'}</td>
                      <td className="p-3 text-center text-gray-400 font-semibold text-xs">VS</td>
                      <td className="p-3 font-bold text-gray-800">{teams.find((t: any) => t.id === f.away_team_id)?.name || f.away_team_id || 'TBD'}</td>
                      <td className="p-3 text-gray-600 font-mono">{f.kick_off_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Render Matches List View */}
      {viewMode === 'list' && !generatedFixtures && matches.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupMatchesByMatchday(matches)).map(([stageName, mds]) => (
            <div key={stageName} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[#0A1628] px-6 py-4 font-bold text-white flex items-center justify-between">
                <span className="text-sm tracking-wider uppercase">{stageName}</span>
                <span className="bg-[#00D084] text-slate-900 text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                  {mds.length} Matches
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {mds.map(match => (
                  <div key={match.id} className="p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                    <div className="flex-1 w-full grid grid-cols-3 items-center gap-4">
                      {/* Home team */}
                      <div className="text-right font-bold text-gray-900 truncate">
                        {match.home_team?.name || 'TBD'}
                      </div>
                      
                      {/* Matchday info / Score */}
                      <div className="text-center">
                        {match.status?.toLowerCase() === 'completed' ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-extrabold text-base text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                {match.home_score ?? 0}
                              </span>
                              <span className="text-gray-400 font-bold text-xs">-</span>
                              <span className="font-extrabold text-base text-slate-900 bg-slate-100 px-2 py-1 rounded">
                                {match.away_score ?? 0}
                              </span>
                            </div>
                            {match.home_penalty_score !== null && match.home_penalty_score !== undefined &&
                             match.away_penalty_score !== null && match.away_penalty_score !== undefined && (
                              <span className="text-[10px] font-bold text-emerald-600 font-mono mt-1">
                                Pen {match.home_penalty_score} - {match.away_penalty_score}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-[#00D084]/10 px-3 py-1 rounded-full text-xs font-bold text-[#00B875] inline-block">
                            {match.kick_off_time ? match.kick_off_time.slice(0, 5) : 'TBD'}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-400 font-mono mt-1">
                          {match.match_date ? new Date(match.match_date).toLocaleDateString('en-GB') : 'TBD'}
                        </div>
                      </div>
                      
                      {/* Away team */}
                      <div className="font-bold text-gray-900 truncate">
                        {match.away_team?.name || 'TBD'}
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex justify-end items-center gap-4 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 border-gray-100">
                      {match.status?.toLowerCase() !== 'live' && match.status?.toLowerCase() !== 'completed' && (
                        <button
                          onClick={() => handleStartMatch(match)}
                          className="bg-[#00D084] hover:bg-[#00B875] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:scale-105 active:scale-95"
                        >
                          <Play size={12} className="fill-current" /> Start Match
                        </button>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        match.status?.toLowerCase() === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                        match.status?.toLowerCase() === 'live' ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' :
                        match.status?.toLowerCase() === 'postponed' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {match.status ? match.status.charAt(0).toUpperCase() + match.status.slice(1) : ''}
                      </span>
                      <button onClick={() => openModal(match)} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                        <Edit size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render Matches Grid / Interactive Scheduler View */}
      {viewMode === 'calendar' && !generatedFixtures && matches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden space-y-4">
          <div className="flex items-center gap-2 text-slate-700 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <HelpCircle size={16} className="text-slate-500" />
            <span><strong>Organizer Drag-and-Drop Scheduler:</strong> Drag any scheduled match card to another date column or time slot to dynamically reschedule it. Completed matches cannot be rescheduled and look dull.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm table-fixed min-w-[700px]">
              <thead className="bg-[#0A1628] text-white">
                <tr>
                  <th className="border border-slate-700 p-3 w-24 text-center">Time</th>
                  {getCalendarDates().map(d => (
                    <th key={d} className="border border-slate-700 p-3 text-center">
                      <div className="font-bold">{new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-[10px] text-gray-300 font-mono font-medium">{d}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot} className="hover:bg-slate-50/50">
                    <td className="border border-gray-200 p-3 font-mono font-extrabold text-center bg-gray-50 text-[#0A1628] w-24">
                      {slot}
                    </td>
                    {getCalendarDates().map(dateVal => {
                      // Find match at this slot
                      const matchAtCell = matches.filter(m => {
                        return m.match_date === dateVal && m.kick_off_time?.startsWith(slot);
                      });

                      return (
                        <td
                          key={dateVal}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleMatchDrop(e, dateVal, slot)}
                          className="border border-gray-200 p-2 min-h-[90px] relative transition-colors hover:bg-slate-50/80"
                        >
                          <div className="space-y-2 h-full flex flex-col justify-start">
                            {matchAtCell.map(m => {
                               const isCompleted = m.status?.toLowerCase() === 'completed';
                              return (
                                <div
                                  key={m.id}
                                  draggable={!isCompleted}
                                  onDragStart={e => handleDragStart(e, m.id)}
                                  className={`p-2.5 rounded-lg border transition-all select-none text-left ${
                                    isCompleted
                                      ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-60 pointer-events-none'
                                      : 'bg-white border-blue-200 text-gray-800 shadow-sm cursor-grab hover:border-blue-400 active:cursor-grabbing hover:shadow'
                                  }`}
                                >
                                  <div className="text-[10px] font-bold text-gray-400 mb-1 flex justify-between items-center">
                                    <span className="truncate">{m.stage || 'League'}</span>
                                    {isCompleted && <span className="bg-gray-200 text-gray-500 font-mono px-1 rounded text-[8px]">FINAL</span>}
                                  </div>
                                  <div className="font-extrabold text-xs truncate">
                                    {m.home_team?.name || 'TBD'}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-semibold my-0.5 text-center">
                                    {isCompleted ? (
                                      <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-extrabold flex flex-col items-center">
                                        <span>{m.home_score} - {m.away_score}</span>
                                        {m.home_penalty_score !== null && m.home_penalty_score !== undefined &&
                                         m.away_penalty_score !== null && m.away_penalty_score !== undefined && (
                                          <span className="text-[8px] font-bold text-emerald-600 font-mono mt-0.5">
                                            Pen {m.home_penalty_score} - {m.away_penalty_score}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span>VS</span>
                                    )}
                                  </div>
                                  <div className="font-extrabold text-xs truncate">
                                    {m.away_team?.name || 'TBD'}
                                  </div>
                                  {m.status?.toLowerCase() !== 'live' && m.status?.toLowerCase() !== 'completed' && (
                                    <button
                                      onClick={() => handleStartMatch(m)}
                                      className="mt-2 w-full bg-[#00D084] hover:bg-[#00B875] text-white py-1 rounded text-[10px] font-bold transition-all flex items-center justify-center gap-1 hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                      <Play size={10} className="fill-current" /> Start Match
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            {matchAtCell.length === 0 && (
                              <div className="h-full min-h-[40px] flex items-center justify-center text-[10px] text-gray-300 italic font-medium select-none pointer-events-none">
                                Empty
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Add/Edit Match Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#0A1628]" style={{ fontFamily: 'Georgia, serif' }}>
                {editingMatch ? 'Edit Match Details' : 'Add New Match'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Home Team</label>
                  <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40">
                    <option value="">Select Team (or TBD)</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Away Team</label>
                  <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40">
                    <option value="">Select Team (or TBD)</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40">
                    <option value="Scheduled">Scheduled</option>
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                    <option value="Postponed">Postponed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stage / Round</label>
                  <input type="text" value={stage} onChange={e => setStage(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#00D084]/40" placeholder="e.g. League, Group A, Semis" required />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={generating} className="px-5 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#00D084]/15">
                  {generating && <Loader2 size={16} className="animate-spin" />}
                  Save Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
