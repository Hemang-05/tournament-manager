'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Users, Upload, Loader2, Share2, Copy } from 'lucide-react';
import Link from 'next/link';

export default function TeamsClient({ 
  initialTeams, 
  tournamentId,
  playersPerTeam,
  tournamentSlug,
  maxTeams
}: { 
  initialTeams: any[], 
  tournamentId: string,
  playersPerTeam: number,
  tournamentSlug: string,
  maxTeams: number
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(Array(playersPerTeam).fill(''));
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const openModal = (team: any = null) => {
    if (!team && teams.length >= maxTeams) {
      alert(`Cannot add more teams. The maximum team limit of ${maxTeams} has been reached.`);
      return;
    }
    setEditingTeam(team);
    setName(team?.name || '');
    setManagerName(team?.manager_name || '');
    setLogoFile(null);
    setPlayerNames(Array(playersPerTeam).fill(''));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let logo_url = editingTeam?.logo_url;

    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${tournamentId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, logoFile);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('team-logos').getPublicUrl(filePath);
        logo_url = data.publicUrl;
      }
    }

    if (editingTeam) {
      const { data, error } = await supabase
        .from('teams')
        .update({ name, manager_name: managerName, logo_url })
        .eq('id', editingTeam.id)
        .select()
        .single();
        
      if (error) {
        alert(`Failed to update team: ${error.message}`);
        setLoading(false);
        return;
      }
      if (data) {
        setTeams(teams.map(t => t.id === data.id ? { ...t, ...data } : t));
      }
    } else {
      if (teams.length >= maxTeams) {
        alert(`Cannot add team. The maximum limit of ${maxTeams} teams has been reached.`);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('teams')
        .insert({ tournament_id: tournamentId, name, manager_name: managerName, logo_url })
        .select()
        .single();
        
      if (error) {
        alert(`Failed to create team: ${error.message}`);
        setLoading(false);
        return;
      }
      if (data) {
        const validPlayers = playerNames.filter(p => p.trim() !== '');
        if (validPlayers.length > 0) {
          const playersToInsert = validPlayers.map(pName => ({
            team_id: data.id,
            name: pName,
            role: 'player'
          }));
          const { error: pErr } = await supabase.from('players').insert(playersToInsert);
          if (pErr) {
            alert(`Team created, but failed to insert players: ${pErr.message}`);
          }
        }
        
        // Include correct count in UI
        const teamWithCount = {
          ...data,
          players: [{ count: validPlayers.length }]
        };
        setTeams([...teams, teamWithCount]);
      }
    }

    setLoading(false);
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;
    
    await supabase.from('teams').delete().eq('id', id);
    setTeams(teams.filter(t => t.id !== id));
    router.refresh();
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${tournamentSlug}/register` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="border border-[#00D084] text-[#00D084] hover:bg-[#00D084]/5 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <Share2 size={18} /> Share Registration Link
          </button>
          <button
            onClick={() => openModal()}
            className="bg-[#00D084] hover:bg-[#00B875] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
          >
            <Plus size={20} /> Add Team
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col hover:border-[#00D084] hover:shadow transition-all group">
            <Link href={`/admin/teams/${team.id}`} className="p-6 flex-1 flex flex-col items-center text-center cursor-pointer">
              <div className="w-20 h-20 bg-gray-100 rounded-full mb-4 flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-[#00D084] transition-colors">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="text-gray-400" size={32} />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#00D084] transition-colors">{team.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{team.manager_name || 'No manager'}</p>
              <div className="mt-auto px-3 py-1 bg-gray-50 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
                {team.players?.[0]?.count || 0} Players
              </div>
            </Link>
            <div className="border-t border-gray-100 flex divide-x divide-gray-100 bg-gray-50">
              <button onClick={() => openModal(team)} className="flex-1 py-2.5 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-white transition-colors flex items-center justify-center gap-1">
                <Edit size={14} /> Edit
              </button>
              <button onClick={() => handleDelete(team.id)} className="flex-1 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-white transition-colors flex items-center justify-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingTeam ? 'Edit Team' : 'Add Team'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#00D084] focus:border-[#00D084] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager Name</label>
                <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#00D084] focus:border-[#00D084] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Logo</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : editingTeam?.logo_url ? (
                      <img src={editingTeam.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-gray-400" size={24} />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {!editingTeam && (
                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-semibold text-gray-700">Roster Names ({playersPerTeam} players allowed)</label>
                  <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-3 border border-gray-200 bg-gray-50 rounded-xl">
                    {Array.from({ length: playersPerTeam }).map((_, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold mb-0.5">Player {i + 1}</span>
                        <input
                          type="text"
                          placeholder="Player Name"
                          value={playerNames[i] || ''}
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
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Share Registration Link</h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Send this link to captains or managers so they can register their team name, logo, and squad list themselves.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  type="text"
                  value={shareUrl}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-[#00D084] hover:bg-[#00B875] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm shrink-0"
                >
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
