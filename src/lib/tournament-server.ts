import { cookies } from 'next/headers';

export function getSelectedTournamentId(cookieStore?: ReturnType<typeof cookies>) {
  const store = cookieStore || cookies();
  return store.get('selected_tournament_id')?.value || null;
}
