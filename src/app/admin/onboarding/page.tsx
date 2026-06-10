'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2, Trophy, ChevronRight, ChevronLeft, Check,
  Eye, EyeOff, AlertCircle
} from 'lucide-react';

/* ───────── Sport-specific default rules ───────── */
const SPORT_RULES: Record<string, string> = {
  Football: `6-a-side football rules apply.

1. Matches are 20 minutes each half (40 minutes total).
2. No slide tackles allowed — free kick awarded for any slide challenge.
3. Rolling substitutions permitted at any stoppage.
4. No offside rule enforced.
5. Goal kicks can be taken from the hand.
6. 5-minute half-time break.
7. In knockout rounds, a draw goes to 3 penalties per side.
8. Yellow card = warning. Two yellows = red = 1-match ban.
9. Straight red = minimum 2-match ban.
10. Referee's decision is final.`,

  Cricket: `Format: T20 (20 overs per side).

1. 11 players per team.
2. Each bowler may bowl a maximum of 4 overs.
3. Powerplay: Overs 1–6 (only 2 fielders outside the 30-yard circle).
4. No Duckworth-Lewis method — rain-affected matches replayed.
5. Free hit awarded after any no-ball.
6. Wide-ball re-bowled + 1 run penalty.
7. Overthrows count as regular runs.
8. LBW decisions at umpire's discretion.
9. Retired hurt batters may return at the fall of a wicket.
10. Organiser's decision is final on disputes.`,

  Basketball: `5-a-side basketball rules.

1. 4 quarters × 10 minutes (FIBA timing).
2. Shot clock: 24 seconds.
3. 5 personal fouls = player disqualification for the game.
4. Free throws awarded on team fouls (5th foul per quarter onwards).
5. 3-point line in effect.
6. 2-minute break between quarters, 10-minute half-time.
7. Overtime: 5 minutes, sudden-death if still tied.
8. Technical foul = 1 free throw + possession.
9. No zone defence restrictions.
10. Referee's decision is final.`,

  Pickleball: `Standard USAPA rules apply.

1. Best of 3 games to 11 points (win by 2).
2. Rally scoring in effect.
3. Two-bounce rule: ball must bounce once on each side before volleys.
4. Non-volley zone ("kitchen") — 7 feet from net, no volleys permitted.
5. Serve must be underhand and diagonal.
6. Only the serving team can score (if side-out scoring elected).
7. Let serves are replayed.
8. Faults: stepping into kitchen on volley, out-of-bounds, net contact.
9. Timeouts: 2 per game, 1 minute each.
10. Referee's decision is final.`,

  Other: '',
};

/* ───────── Slug utility ───────── */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ───────── Types ───────── */
type Sport = 'Football' | 'Cricket' | 'Basketball' | 'Pickleball' | 'Other';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Password ── */
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── Tournament ── */
  const [tournamentName, setTournamentName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [sport, setSport] = useState<Sport>('Football');
  const [sportCustom, setSportCustom] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [venueName, setVenueName] = useState('');
  const [matchDays, setMatchDays] = useState<string[]>(['Sat', 'Sun']);
  const [maxMatchesPerDay, setMaxMatchesPerDay] = useState(4);
  const [maxTeams, setMaxTeams] = useState('8');

  /* ── Step 3: Rules ── */
  const [rules, setRules] = useState(SPORT_RULES.Football);

  /* Auto-generate slug from tournament name */
  useEffect(() => {
    if (!slugManual && tournamentName) {
      setSlug(slugify(tournamentName));
    }
  }, [tournamentName, slugManual]);

  /* Update rules when sport changes */
  const handleSportChange = (newSport: Sport) => {
    setSport(newSport);
    setRules(SPORT_RULES[newSport]);
  };

  const toggleDay = (day: string) => {
    setMatchDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  /* ── Step navigation ── */
  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!tournamentName.trim()) { setError('Tournament name is required'); return; }
      if (sport === 'Other' && !sportCustom.trim()) { setError('Please enter your sport name'); return; }
      if (!playersPerTeam || isNaN(Number(playersPerTeam)) || Number(playersPerTeam) <= 0) {
        setError('Players per Team is a required positive number');
        return;
      }
      if (!maxTeams || isNaN(Number(maxTeams)) || Number(maxTeams) < 2 || Number(maxTeams) > 64) {
        setError('Max Teams must be a number between 2 and 64');
        return;
      }
    }
    if (step === 2) {
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    }
    setStep(s => s + 1);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const generatedSlug = slug || slugify(tournamentName);

    try {
      // 1. Create organiser account with username = slug, name = Admin
      const signupRes = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Admin', username: generatedSlug, password }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        setError(signupData.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // 2. Create tournament
      const tournamentRes = await fetch('/api/admin/tournaments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tournamentName,
          slug: generatedSlug,
          sport: sport === 'Other' ? 'Other' : sport,
          sport_custom: sport === 'Other' ? sportCustom : null,
          players_per_team: Number(playersPerTeam),
          start_date: startDate || null,
          end_date: endDate || null,
          venue_name: venueName || null,
          match_days: matchDays,
          max_matches_per_day: maxMatchesPerDay,
          max_teams: Number(maxTeams),
          rules_content: rules,
          is_public: true,
        }),
      });

      const tournamentData = await tournamentRes.json();

      if (!tournamentRes.ok) {
        setError(tournamentData.error || 'Failed to create tournament');
        setLoading(false);
        return;
      }

      document.cookie = `selected_tournament_id=${tournamentData.tournament.id}; path=/`;
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const stepLabels = ['Tournament', 'Access Password', 'Rules'];
  const formats = [
    { value: 'League', label: 'League', desc: 'Round-robin format' },
    { value: 'Knockout', label: 'Knockout', desc: 'Single elimination' },
    { value: 'League + Knockout', label: 'League + Knockout', desc: 'Group stage then KO' },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] py-8 px-4 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#00D084]/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D084] to-[#00B871]">
            <Trophy className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white">Tournament<span className="text-[#00D084]">Mgr</span></span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Progress bar */}
          <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 sm:px-8 py-5">
            <div className="flex items-center justify-between relative">
              {/* Track */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#E2E8F0]" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-[#00D084] transition-all duration-500 ease-out"
                style={{ width: `calc(${((step - 1) / 2) * 100}% - 48px + ${(step - 1) * 24}px)` }}
              />

              {[1, 2, 3].map(i => (
                <div key={i} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
                      step > i
                        ? 'bg-[#00D084] text-white shadow-sm shadow-[#00D084]/25'
                        : step === i
                        ? 'bg-[#00D084] text-white shadow-md shadow-[#00D084]/30 ring-4 ring-[#00D084]/10'
                        : 'bg-white text-[#94A3B8] border-2 border-[#E2E8F0]'
                    }`}
                  >
                    {step > i ? <Check className="h-4 w-4" /> : i}
                  </div>
                  <span className={`mt-2 text-xs font-semibold transition-colors ${
                    step >= i ? 'text-[#0F172A]' : 'text-[#94A3B8]'
                  }`}>
                    {stepLabels[i - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Global error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ═══════════════ STEP 1: Tournament Details ═══════════════ */}
            {step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Georgia, serif' }}>
                    Tournament details
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    Configure your tournament settings. You can change these later.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Tournament Name */}
                  <div>
                    <label htmlFor="onb-tname" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Tournament Name
                    </label>
                    <input
                      id="onb-tname"
                      type="text"
                      value={tournamentName}
                      onChange={e => setTournamentName(e.target.value)}
                      placeholder="Sunday League 2026"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                      required
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label htmlFor="onb-slug" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      URL Slug
                    </label>
                    <input
                      id="onb-slug"
                      type="text"
                      value={slug}
                      onChange={e => {
                        setSlugManual(true);
                        setSlug(slugify(e.target.value));
                      }}
                      placeholder="sunday-league-2026"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all font-mono"
                    />
                    {slug && (
                      <p className="text-xs text-[#94A3B8] mt-1.5 font-mono">
                        yourdomain.com/t/<span className="text-[#00D084] font-semibold">{slug}</span>
                      </p>
                    )}
                  </div>

                  {/* Sport */}
                  <div>
                    <label htmlFor="onb-sport" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Sport
                    </label>
                    <select
                      id="onb-sport"
                      value={sport}
                      onChange={e => handleSportChange(e.target.value as Sport)}
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2224%22%20height%3d%2224%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%2394A3B8%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center] bg-[length:16px]"
                    >
                      <option value="Football">Football</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Pickleball">Pickleball</option>
                      <option value="Other">Other</option>
                    </select>
                    {sport === 'Other' && (
                      <input
                        type="text"
                        value={sportCustom}
                        onChange={e => setSportCustom(e.target.value)}
                        placeholder="Enter sport name"
                        className="w-full mt-2 px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                        required
                      />
                    )}
                  </div>

                  {/* Players per Team */}
                  <div>
                    <label htmlFor="onb-players-per-team" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Players per Team *
                    </label>
                    <input
                      id="onb-players-per-team"
                      required
                      type="number"
                      min="1"
                      max="25"
                      value={playersPerTeam}
                      onChange={e => setPlayersPerTeam(e.target.value)}
                      placeholder="8"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="onb-start" className="block text-sm font-semibold text-[#374151] mb-1.5">
                        Start Date
                      </label>
                      <input
                        id="onb-start"
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="onb-end" className="block text-sm font-semibold text-[#374151] mb-1.5">
                        End Date
                      </label>
                      <input
                        id="onb-end"
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                      />
                    </div>
                  </div>

                  {/* Venue */}
                  <div>
                    <label htmlFor="onb-venue" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Venue Name
                    </label>
                    <input
                      id="onb-venue"
                      type="text"
                      value={venueName}
                      onChange={e => setVenueName(e.target.value)}
                      placeholder="e.g. Central Park Fields"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                    />
                  </div>

                  {/* Match Days */}
                  <div>
                    <label className="block text-sm font-semibold text-[#374151] mb-2">Match Days</label>
                    <div className="flex flex-wrap gap-2">
                      {days.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            matchDays.includes(day)
                              ? 'bg-[#0A1628] text-white shadow-sm'
                              : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Teams */}
                  <div>
                    <label htmlFor="onb-maxteams" className="block text-sm font-semibold text-[#374151] mb-1.5">
                      Max Teams
                    </label>
                    <input
                      id="onb-maxteams"
                      type="text"
                      value={maxTeams}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          setMaxTeams(val);
                        }
                      }}
                      placeholder="8"
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  disabled={!tournamentName || !playersPerTeam || !maxTeams}
                  className="w-full mt-4 bg-[#00D084] hover:bg-[#00B871] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-[#00D084]/20"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ═══════════════ STEP 2: Access Password ═══════════════ */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Georgia, serif' }}>
                    Access Password
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    Set a password to manage this tournament. Keep it secure.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Password fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="onb-password" className="block text-sm font-semibold text-[#374151] mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          id="onb-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          autoComplete="new-password"
                          className="w-full px-3.5 py-2.5 pr-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="onb-confirm" className="block text-sm font-semibold text-[#374151] mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          id="onb-confirm"
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          className={`w-full px-3.5 py-2.5 pr-10 bg-[#F8FAFC] border rounded-lg text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition-all ${
                            confirmPassword && confirmPassword !== password
                              ? 'border-red-300 focus:ring-red-400/40 focus:border-red-400'
                              : 'border-[#E2E8F0] focus:ring-[#00D084]/40 focus:border-[#00D084]'
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Passwords don&apos;t match
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setError(''); setStep(1); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#E2E8F0] text-[#374151] font-semibold py-2.5 px-4 rounded-lg hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!password || !confirmPassword || password !== confirmPassword}
                    className="flex-[2] bg-[#00D084] hover:bg-[#00B871] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-[#00D084]/20"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════ STEP 3: Rules ═══════════════ */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Georgia, serif' }}>
                    Tournament rules
                  </h2>
                  <p className="text-sm text-[#64748B] mt-1">
                    {sport !== 'Other'
                      ? `Pre-filled with ${sport} defaults. Edit freely.`
                      : 'Write the rules for your tournament.'}
                  </p>
                </div>

                <div>
                  <textarea
                    id="onb-rules"
                    rows={14}
                    value={rules}
                    onChange={e => setRules(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg resize-none font-mono text-sm text-[#0F172A] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] transition-all"
                    placeholder="Enter your tournament rules here..."
                  />
                  <p className="text-xs text-[#94A3B8] mt-2 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    You can update these rules anytime from the admin panel.
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { setError(''); setStep(2); }}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#E2E8F0] text-[#374151] font-semibold py-2.5 px-4 rounded-lg hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] bg-[#00D084] hover:bg-[#00B871] active:scale-[0.98] text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none shadow-sm shadow-[#00D084]/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>Creating…</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="h-4 w-4" />
                        <span>Create Tournament</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#475569]/50 mt-6">
          Already have an account?{' '}
          <a href="/admin/login" className="text-[#00D084]/60 hover:text-[#00D084] transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
