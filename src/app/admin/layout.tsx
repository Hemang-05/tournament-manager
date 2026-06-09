import type { Metadata } from "next";
import { getSessionFromCookies } from "@/lib/auth";
import Link from "next/link";
import TournamentSwitcher from "@/components/layout/TournamentSwitcher";
import AdminNav from "@/components/layout/AdminNav";
import LogoutButton from "@/components/layout/LogoutButton";
import DeleteTournamentButton from "@/components/layout/DeleteTournamentButton";
import { getSelectedTournamentId } from "@/lib/tournament";
import { createServerClient } from "@/lib/supabase-server";
import { LayoutDashboard, Users, CalendarDays, ClipboardList, Trophy, GitFork, FileText, Settings, Plus } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  dashboard: LayoutDashboard,
  teams: Users,
  fixtures: CalendarDays,
  results: ClipboardList,
  standings: Trophy,
  bracket: GitFork,
  pages: FileText,
  settings: Settings,
};

export const metadata: Metadata = {
  title: "Admin Dashboard | Tournament Manager",
  description: "Organiser dashboard for managing your football tournament.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  // If not authenticated, render children without sidebar (login/onboarding pages)
  // Middleware handles the actual route protection
  if (!session) {
    return <>{children}</>;
  }

  const supabase = createServerClient();
  const tournamentId = getSelectedTournamentId();
  let tournamentName = '';

  if (tournamentId) {
    const { data: currentT } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();
    if (currentT) tournamentName = currentT.name;
  }

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: 'dashboard' },
    { name: 'Teams', href: '/admin/teams', icon: 'teams' },
    { name: 'Fixtures', href: '/admin/fixtures', icon: 'fixtures' },
    { name: 'Results', href: '/admin/results', icon: 'results' },
    { name: 'Standings', href: '/admin/standings', icon: 'standings' },
    { name: 'Bracket', href: '/admin/bracket', icon: 'bracket' },
    { name: 'Pages', href: '/admin/pages', icon: 'pages' },
    { name: 'Settings', href: '/admin/settings', icon: 'settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[240px] bg-[#0A1628] text-white flex-shrink-0">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00D084]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white"><circle cx="12" cy="12" r="10" /><polygon points="12 6 12 18" /><path d="M6.3 6.3l11.4 11.4" /><path d="M17.7 6.3L6.3 17.7" /></svg>
            </div>
            <span className="text-lg font-bold text-white">Tournament<span className="text-[#00D084]">Mgr</span></span>
          </Link>
          <TournamentSwitcher />
          <Link 
            href="/admin/onboarding" 
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#00D084]/50 text-[#00D084] hover:border-[#00D084] hover:bg-[#00D084]/10 transition-colors text-xs font-bold"
          >
            <Plus size={14} /> Add Tournament
          </Link>
        </div>
        <AdminNav items={navItems} />
        <div className="p-4 mt-auto space-y-1">
          <DeleteTournamentButton tournamentId={tournamentId} tournamentName={tournamentName} />
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden bg-[#0A1628] text-white p-2 flex justify-around items-center border-t border-gray-800">
        {navItems.slice(0, 5).map((item) => {
          const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
          return (
            <Link key={item.name} href={item.href} className="flex flex-col items-center p-2 text-gray-400 hover:text-white">
              <IconComponent size={20} />
              <span className="text-[10px] mt-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
