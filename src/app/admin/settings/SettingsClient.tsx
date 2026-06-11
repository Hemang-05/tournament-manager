'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, CheckCircle, Loader2 } from 'lucide-react';
import DeleteTournamentButton from '@/components/layout/DeleteTournamentButton';

export default function SettingsClient({ tournament }: { tournament: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState(tournament.name || '');
  const [venueName, setVenueName] = useState(tournament.venue_name || '');
  const [startDate, setStartDate] = useState(tournament.start_date || '');
  const [endDate, setEndDate] = useState(tournament.end_date || '');
  const [maxMatchesPerDay, setMaxMatchesPerDay] = useState(tournament.max_matches_per_day || 4);
  const [maxTeams, setMaxTeams] = useState(tournament.max_teams || 8);
  const [playersPerTeam, setPlayersPerTeam] = useState(tournament.players_per_team || 8);
  const [rules, setRules] = useState(tournament.rules_content || '');
  
  const [dailyStartTime, setDailyStartTime] = useState(tournament.daily_start_time || '09:00');
  const [dailyEndTime, setDailyEndTime] = useState(tournament.daily_end_time || '18:00');
  const [matchDuration, setMatchDuration] = useState(tournament.match_duration || 20);
  
  // Points config
  const [pointsWin, setPointsWin] = useState(tournament.points_win !== undefined && tournament.points_win !== null ? tournament.points_win : 2);
  const [pointsDraw, setPointsDraw] = useState(tournament.points_draw !== undefined && tournament.points_draw !== null ? tournament.points_draw : 1);
  const [pointsLoss, setPointsLoss] = useState(tournament.points_loss !== undefined && tournament.points_loss !== null ? tournament.points_loss : 0);

  // Match days
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [matchDays, setMatchDays] = useState<string[]>(tournament.match_days || ['Sat', 'Sun']);

  const toggleDay = (day: string) => {
    setMatchDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          venue_name: venueName || null,
          start_date: startDate || null,
          end_date: endDate || null,
          max_matches_per_day: Number(maxMatchesPerDay),
          max_teams: Number(maxTeams),
          players_per_team: Number(playersPerTeam),
          rules_content: rules || null,
          match_days: matchDays,
          points_win: Number(pointsWin),
          points_draw: Number(pointsDraw),
          points_loss: Number(pointsLoss),
          daily_start_time: dailyStartTime,
          daily_end_time: dailyEndTime,
          match_duration: Number(matchDuration),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-[#00D084]" /> Tournament Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure general information, points systems, and parameters.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" /> Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 space-y-8 shadow-sm">
        {/* Section 1: Basic Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name *</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
              <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
          </div>
        </div>

        {/* Section 2: Parameters */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Limits & Scheduling</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Players per Team *</label>
              <input required type="number" min="1" max="25" value={playersPerTeam} onChange={e => setPlayersPerTeam(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Teams *</label>
              <input required type="number" min="2" max="32" value={maxTeams} onChange={e => setMaxTeams(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Match Start Time *</label>
              <input required type="time" value={dailyStartTime} onChange={e => setDailyStartTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Match End Time *</label>
              <input required type="time" value={dailyEndTime} onChange={e => setDailyEndTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Match Duration (Minutes) *</label>
              <input required type="number" min="5" max="180" value={matchDuration} onChange={e => setMatchDuration(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Match Days</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => {
                const active = matchDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      active ? 'bg-[#0A1628] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Custom Points System */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Custom Points System</h2>
          <p className="text-xs text-gray-500 -mt-2">Customize the points awarded for group and league standings matches.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points for Win *</label>
              <input required type="number" min="0" max="10" value={pointsWin} onChange={e => setPointsWin(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points for Draw *</label>
              <input required type="number" min="0" max="10" value={pointsDraw} onChange={e => setPointsDraw(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points for Loss *</label>
              <input required type="number" min="0" max="10" value={pointsLoss} onChange={e => setPointsLoss(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40" />
            </div>
          </div>
        </div>

        {/* Section 4: Rules */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Rules & Information</h2>
          <textarea
            value={rules}
            onChange={e => setRules(e.target.value)}
            rows={6}
            placeholder="Write rules, information or guidelines for your players and team managers..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 font-sans text-sm leading-relaxed"
          />
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#00D084] hover:bg-[#00B875] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00D084]/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Settings
          </button>
        </div>
      </form>

      {/* Section 5: Danger Zone */}
      <div className="bg-red-50/40 border border-red-100 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs mt-8">
        <div>
          <h2 className="text-lg font-bold text-red-700 border-b border-red-100 pb-2">Danger Zone</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Deleting the tournament will permanently remove all teams, fixtures, results, pages, and organisers linked to this tournament. This action is irreversible.
          </p>
        </div>
        <div className="pt-2 flex justify-start">
          <DeleteTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} />
        </div>
      </div>
    </div>
  );
}
