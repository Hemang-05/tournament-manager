'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function TournamentStatusController({ 
  tournamentId, 
  initialStatus 
}: { 
  tournamentId: string; 
  initialStatus: string; 
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdateStatus = async (newStatus: string) => {
    if (newStatus === status) return;
    
    const confirmChange = window.confirm(
      `Are you sure you want to change the tournament status to ${
        newStatus === 'draft' ? 'Draft/Upcoming' : newStatus === 'active' ? 'Live/Active' : 'Completed'
      }?`
    );
    if (!confirmChange) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update tournament status');
      }

      setStatus(newStatus);
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {loading && <Loader2 size={16} className="animate-spin text-[#00D084]" />}
      <select
        value={status}
        disabled={loading}
        onChange={(e) => handleUpdateStatus(e.target.value)}
        className="bg-white border border-gray-300 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-[#00D084]/40 focus:border-[#00D084] cursor-pointer shadow-sm disabled:opacity-50"
      >
        <option value="draft">Upcoming (Draft)</option>
        <option value="active">Live (Active)</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  );
}
