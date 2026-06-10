import { createServerClient } from "@/lib/supabase-server";
import PublicNavbar from "@/components/PublicNavbar";
import Link from 'next/link';

export const metadata = {
  title: "Tournament Viewer | Powered by Kickoff",
  description: "View tournament standings, fixtures, results, and player statistics.",
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();

  // Fetch first active tournament
  const { data: activeTournaments } = await supabase
    .from("tournaments")
    .select("name")
    .eq("status", "active")
    .limit(1);

  let tournamentName = "";

  if (activeTournaments && activeTournaments.length > 0) {
    tournamentName = activeTournaments[0].name;
  } else {
    // Fallback to first tournament in the database
    const { data: fallbackTournaments } = await supabase
      .from("tournaments")
      .select("name")
      .limit(1);

    if (fallbackTournaments && fallbackTournaments.length > 0) {
      tournamentName = fallbackTournaments[0].name;
    } else {
      tournamentName = "Kickoff Tournament";
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] antialiased">
      {/* Sticky top navigation bar */}
      <PublicNavbar tournamentName={tournamentName} />

      {/* Main content area */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-[#64748B]">
              <span className="font-semibold text-[#0F172A]" style={{ fontFamily: "Georgia, serif" }}>
                {tournamentName}
              </span>
              <span>•</span>
              <span>© {currentYear} All rights reserved.</span>
            </div>
            <div className="text-sm text-[#64748B] flex items-center gap-4">
              <Link href="/host" className="font-semibold text-[#00D084] hover:underline">
                Host Tournament
              </Link>
              <span>Powered by Kickoff</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
