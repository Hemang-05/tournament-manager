'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteTournamentButtonProps {
  tournamentId: string | null;
  tournamentName: string;
  isIconOnly?: boolean;
}

export default function DeleteTournamentButton({ tournamentId, tournamentName, isIconOnly = false }: DeleteTournamentButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  if (!tournamentId) return null;

  const handleDelete = async () => {
    const confirm1 = window.confirm(
      `WARNING: Are you sure you want to delete the tournament "${tournamentName}"?\n\nThis will permanently delete all matches, teams, rosters, results, and custom pages. This action is irreversible.`
    );
    if (!confirm1) return;

    const userInput = window.prompt(
      `To confirm deletion, please type the tournament name exactly: "${tournamentName}"`
    );
    if (userInput !== tournamentName) {
      alert('Tournament name did not match. Deletion cancelled.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete tournament');

      // Clear the selected tournament cookie on client
      document.cookie = 'selected_tournament_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      alert('Tournament successfully deleted.');
      
      // Redirect to admin landing (which will prompt to select or create a tournament)
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      title="Delete Tournament"
      className={
        isIconOnly
          ? "p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center"
          : "w-full flex items-center gap-2 py-2 px-3 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all text-xs font-semibold disabled:opacity-50"
      }
    >
      {deleting ? (
        <Loader2 size={isIconOnly ? 20 : 14} className="animate-spin text-gray-500" />
      ) : (
        <Trash2 size={isIconOnly ? 20 : 14} />
      )}
      {!isIconOnly && <span>{deleting ? 'Deleting...' : 'Delete Tournament'}</span>}
    </button>
  );
}
