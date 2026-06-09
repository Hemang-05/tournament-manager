'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Upload, Loader2, User } from 'lucide-react';

export default function PlayersClient({ initialPlayers, teamId, tournamentId }: { initialPlayers: any[], teamId: string, tournamentId: string }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('player');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const openModal = (player: any = null) => {
    setEditingPlayer(player);
    setName(player?.name || '');
    setPosition(player?.position || '');
    setRole(player?.role?.toLowerCase() || 'player');
    setPhotoFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let photo_url = editingPlayer?.photo_url;

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${tournamentId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, photoFile);
        
      if (!uploadError) {
        const { data } = supabase.storage.from('player-photos').getPublicUrl(filePath);
        photo_url = data.publicUrl;
      }
    }

    if (editingPlayer) {
      const { data, error } = await supabase
        .from('players')
        .update({ name, position, role, photo_url })
        .eq('id', editingPlayer.id)
        .select()
        .single();
        
      if (!error && data) {
        setPlayers(players.map(p => p.id === data.id ? data : p));
      }
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({ team_id: teamId, name, position, role, photo_url })
        .select()
        .single();
        
      if (!error && data) {
        setPlayers([...players, data]);
      }
    }

    setLoading(false);
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    
    await supabase.from('players').delete().eq('id', id);
    setPlayers(players.filter(p => p.id !== id));
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Players</h2>
        <button
          onClick={() => openModal()}
          className="bg-[#00D084] hover:bg-[#00B875] text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Add Player
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4 w-16">Photo</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Position</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.length > 0 ? (
              players.map(player => (
                <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-gray-400" size={16} />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{player.name}</td>
                  <td className="px-6 py-4 text-gray-500">{player.position || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      player.role?.toLowerCase() === 'captain' ? 'bg-yellow-100 text-yellow-800' :
                      player.role?.toLowerCase() === 'goalkeeper' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {player.role ? player.role.charAt(0).toUpperCase() + player.role.slice(1) : 'Player'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(player)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(player.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No players found. Add your first player!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingPlayer ? 'Edit Player' : 'Add Player'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player Name *</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <select value={position} onChange={e => setPosition(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="">None</option>
                    <option value="GK">GK</option>
                    <option value="DEF">DEF</option>
                    <option value="MID">MID</option>
                    <option value="FWD">FWD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                    <option value="goalkeeper">Goalkeeper</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {photoFile ? (
                      <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : editingPlayer?.photo_url ? (
                      <img src={editingPlayer.photo_url} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="text-gray-400" size={24} />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Upload Photo
                    <input type="file" className="hidden" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#00D084] hover:bg-[#00B875] text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
