'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';

const parseOrganiserInfo = (joinedName: string) => {
  if (!joinedName) return [];
  return joinedName.split(' | ').map(part => {
    const contactIndex = part.indexOf(' (Contact: ');
    if (contactIndex !== -1) {
      const name = part.substring(0, contactIndex);
      const contact = part.substring(contactIndex + ' (Contact: '.length, part.length - 1);
      return { name, contact };
    }
    return { name: part, contact: '' };
  });
};

export default function PublicTeamRegisterPage({ params }: { params: { slug: string } }) {
  const [tournament, setTournament] = useState<any>(null);
  const [teamName, setTeamName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [registeredTeamsCount, setRegisteredTeamsCount] = useState(0);
  const [organiserName, setOrganiserName] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadTournament() {
      const { data, error: tErr } = await supabase
        .from('tournaments')
        .select(`
          id, 
          name, 
          players_per_team, 
          max_teams,
          organisers ( name )
        `)
        .eq('slug', params.slug)
        .single();

      if (!tErr && data) {
        setTournament(data);
        const limit = data.players_per_team || 8;
        setPlayerNames(Array(limit).fill(''));

        // Handle organiser name parsing
        const orgData = Array.isArray(data.organisers) ? data.organisers[0] : data.organisers;
        setOrganiserName(orgData?.name || '');

        // Fetch current team count
        const { count } = await supabase
          .from('teams')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', data.id);
        
        setRegisteredTeamsCount(count || 0);
      } else {
        setError('Tournament not found or registration is closed.');
      }
    }
    loadTournament();
  }, [params.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!tournament) return;

    try {
      // Check if team count is already exceeded
      const { count } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournament.id);

      if (count !== null && count >= tournament.max_teams) {
        throw new Error('Tournament has reached maximum capacity of registered teams.');
      }

      let logo_url = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${tournament.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('team-logos')
          .upload(filePath, logoFile);

        if (!uploadError) {
          const { data } = supabase.storage.from('team-logos').getPublicUrl(filePath);
          logo_url = data.publicUrl;
        }
      }

      // Insert Team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          tournament_id: tournament.id,
          name: teamName,
          manager_name: managerName,
          logo_url,
        })
        .select()
        .single();

      if (teamError || !team) {
        throw new Error(teamError?.message || 'Failed to register team.');
      }

      // Insert Players
      const validPlayers = playerNames.filter((p) => p.trim() !== '');
      if (validPlayers.length > 0) {
        const playersToInsert = validPlayers.map((pName) => ({
          team_id: team.id,
          name: pName,
          role: 'player',
        }));
        const { error: playersError } = await supabase.from('players').insert(playersToInsert);
        if (playersError) {
          console.error('Players insert error:', playersError);
        }
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !tournament) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[#00D084]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 border-2 border-green-100 text-green-500">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
          Registration Successful!
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Your team <strong>{teamName}</strong> has been registered for <strong>{tournament.name}</strong>. The organizer will reach out to you once the fixtures are generated.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-in fade-in duration-300">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="border-b border-gray-100 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Register Your Team
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Join the tournament: <span className="font-semibold text-gray-700">{tournament.name}</span>
            </p>
          </div>
          <div className="flex-shrink-0 self-center">
            <span className={`px-4 py-2 rounded-xl text-sm font-extrabold border ${
              registeredTeamsCount >= tournament.max_teams
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              Slots: {registeredTeamsCount} / {tournament.max_teams}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {registeredTeamsCount >= tournament.max_teams ? (
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-amber-800" style={{ fontFamily: 'Georgia, serif' }}>Registration is Full</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                This tournament has reached its maximum capacity of {tournament.max_teams} registered teams.
              </p>
            </div>
            
            {organiserName && (
              <div className="pt-4 border-t border-amber-200/50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Please reach out to the organiser:</p>
                <div className="inline-block text-left bg-white border border-amber-100 rounded-2xl p-4 shadow-sm space-y-2">
                  {parseOrganiserInfo(organiserName).map((org, i) => (
                    <div key={i} className="text-sm text-gray-800 font-medium">
                      <span className="font-bold text-gray-900">{org.name}</span>
                      {org.contact && (
                        <>
                          {' '}– Contact:{' '}
                          <a href={`tel:${org.contact}`} className="text-[#00D084] hover:underline font-bold font-mono">
                            {org.contact}
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-team-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  id="reg-team-name"
                  required
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Red Devils FC"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084]"
                />
              </div>
              <div>
                <label htmlFor="reg-manager-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Captain / Manager Name *
                </label>
                <input
                  id="reg-manager-name"
                  required
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Logo</label>
              <div className="mt-1 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="text-gray-400" size={24} />
                  )}
                </div>
                <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Upload Logo Image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block text-sm font-semibold text-gray-700">Roster Names ({playerNames.length} slots)</label>
              <div className="grid grid-cols-2 gap-3 p-4 border border-gray-200 bg-gray-50 rounded-2xl max-h-56 overflow-y-auto">
                {playerNames.map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-semibold mb-0.5">Player {i + 1} Name</span>
                    <input
                      type="text"
                      placeholder="Enter full name"
                      value={playerNames[i]}
                      onChange={(e) => {
                        const newNames = [...playerNames];
                        newNames[i] = e.target.value;
                        setPlayerNames(newNames);
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:border-[#00D084]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#00D084] hover:bg-[#00B875] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[#00D084]/20 transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Register Team & Squad
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
