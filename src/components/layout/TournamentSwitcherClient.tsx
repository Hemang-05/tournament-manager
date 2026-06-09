'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Tournament = {
  id: string;
  name: string;
  status: string;
};

export default function TournamentSwitcherClient({
  tournaments,
  selectedId
}: {
  tournaments: Tournament[];
  selectedId: string | null;
}) {
  const router = useRouter();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    document.cookie = `selected_tournament_id=${id}; path=/`;
    router.push('/admin');
    router.refresh();
  };

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2 bg-white/5 border border-dashed border-gray-700 rounded-lg">
        <span className="text-xs text-gray-400">No tournaments yet</span>
        <Link href="/admin/onboarding" className="text-[#00D084] text-xs font-bold hover:underline flex items-center gap-0.5">
          Create one →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor="tournament-switch" className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        Active Tournament
      </label>
      <select
        id="tournament-switch"
        value={selectedId || ''}
        onChange={handleSelect}
        className="bg-[#0A1628] text-white border border-gray-700 rounded-lg p-2 text-sm w-full focus:outline-none focus:border-[#00D084] transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2224%22%20height%3d%2224%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%2394A3B8%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_8px_center] bg-[length:14px] pr-8"
      >
        <option value="" disabled>Select a tournament</option>
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
