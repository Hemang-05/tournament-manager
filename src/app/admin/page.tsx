import { createServerClient } from '@/lib/supabase-server';
import { getSessionFromCookies } from '@/lib/auth';
import { getSelectedTournamentId } from '@/lib/tournament';
import Link from 'next/link';
import { Users, CalendarDays, ClipboardList, Wand2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import SelectTournamentList from '@/components/layout/SelectTournamentList';

export default async function AdminDashboard() {
  const supabase = createServerClient();
  const session = await getSessionFromCookies();

  if (!session) redirect('/admin/login');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = (session.name as string) || 'Organiser';

  // Fetch tournaments created by this organiser
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, sport, format, start_date, end_date')
    .eq('organiser_id', session.id as string)
    .order('created_at', { ascending: false });

  const tournamentId = getSelectedTournamentId();

  if (!tournamentId) {
    const hasTournaments = tournaments && tournaments.length > 0;
    return (
      <div className="p-8 max-w-4xl">
        <h1 className="text-3xl font-black text-gray-900 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          {greeting}, {name}
        </h1>
        {hasTournaments ? (
          <div>
            <p className="text-gray-600 mb-6 font-medium">Please select one of your active tournaments to manage, or add a new one from the sidebar.</p>
            <SelectTournamentList tournaments={tournaments} />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center py-12">
            <p className="text-gray-600 mb-6 font-medium">You haven't created a tournament yet. Let's get started!</p>
            <Link href="/admin/onboarding" className="inline-flex items-center justify-center bg-[#00D084] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#00B871] transition-colors shadow-lg shadow-[#00D084]/20">
              Create a Tournament
            </Link>
          </div>
        )}
      </div>
    );
  }

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return <div className="p-8">Tournament not found</div>;

  // Basic stats
  const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
  const { count: matchesCount } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId);
  const { count: completedMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId).eq('status', 'completed');
  const { count: pendingResults } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId).in('status', ['scheduled', 'live']);

  // Upcoming matches
  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select(`
      id,
      match_date,
      status,
      home_team:home_team_id (name),
      away_team:away_team_id (name)
    `)
    .eq('tournament_id', tournamentId)
    .in('status', ['scheduled', 'live'])
    .order('match_date', { ascending: true })
    .limit(3);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{greeting}, {name}</h1>
          <div className="flex items-center gap-3">
            <h2 className="text-xl text-gray-600">{tournament.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              tournament.status === 'Active' ? 'bg-green-100 text-green-800' :
              tournament.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {tournament.status}
            </span>
          </div>
        </div>
        <button className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
          Edit Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Teams" value={`${teamsCount || 0} / ${tournament.max_teams}`} icon={Users} />
        <StatCard title="Matches Played" value={`${completedMatches || 0} / ${matchesCount || 0}`} icon={CalendarDays} />
        <StatCard title="Upcoming (3 Days)" value="0" icon={CalendarDays} />
        <StatCard title="Pending Results" value={`${pendingResults || 0}`} icon={ClipboardList} />
      </div>

      <div>
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction href="/admin/teams" title="Add Team" icon={Users} color="bg-blue-50 text-blue-600" />
          <QuickAction href="/admin/fixtures" title="Generate Fixtures" icon={Wand2} color="bg-purple-50 text-purple-600" />
          <QuickAction href="/admin/results" title="Log Result" icon={ClipboardList} color="bg-green-50 text-green-600" />
          <QuickAction href="/admin/results" title="AI Match Report" icon={Wand2} color="bg-orange-50 text-orange-600" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Upcoming Fixtures</h3>
          <Link href="/admin/fixtures" className="text-sm text-[#00D084] font-medium hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingMatches && upcomingMatches.length > 0 ? (
            upcomingMatches.map((match) => (
              <div key={match.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500 w-24">
                    {new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className="font-medium text-gray-900 w-48 text-right truncate">{(match.home_team as any)?.name}</div>
                  <div className="px-3 py-1 bg-gray-100 rounded text-xs font-bold text-gray-500">VS</div>
                  <div className="font-medium text-gray-900 w-48 truncate">{(match.away_team as any)?.name}</div>
                </div>
                <Link href={`/admin/results/${match.id}`} className="text-sm bg-[#0A1628] text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                  Log Result
                </Link>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">No upcoming fixtures found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string, icon: any }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="text-gray-400" size={24} />
      </div>
    </div>
  );
}

function QuickAction({ href, title, icon: Icon, color }: { href: string, title: string, icon: any, color: string }) {
  return (
    <Link href={href} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <span className="font-medium text-gray-900">{title}</span>
    </Link>
  );
}
