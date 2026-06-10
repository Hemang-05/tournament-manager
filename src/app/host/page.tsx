import Link from 'next/link';
import { Phone, Mail, ArrowLeft, Trophy, Shield, Zap } from 'lucide-react';

export const metadata = {
  title: 'Host a Tournament | TournamentMgr',
  description: 'Create and manage your own sports leagues, fixtures, and standings. Contact us to get started.',
};

export default function HostTournamentPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Header / Navbar */}
      <nav className="bg-[#0A1628] text-white border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00D084]">
              <Trophy className="h-4.5 w-4.5 text-[#0A1628]" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Tournament<span className="text-[#00D084]">Mgr</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {/* Intro */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
            Host Your Tournament
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Get your own custom league dashboard, automated schedule generator, interactive standings tables, and live score loggers today.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
            <div className="p-3 bg-[#00D084]/10 rounded-xl text-[#00D084]">
              <Zap size={24} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Instant Scheduler</h3>
            <p className="text-sm text-slate-600">Generate round-robin fixtures or knockout bracket trees in seconds with custom parameters.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
            <div className="p-3 bg-[#00D084]/10 rounded-xl text-[#00D084]">
              <Trophy size={24} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Live Score log</h3>
            <p className="text-sm text-slate-600">Referee control panel with fast stats logging, scorers tracking, and instant standings updates.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4">
            <div className="p-3 bg-[#00D084]/10 rounded-xl text-[#00D084]">
              <Shield size={24} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Organiser Control</h3>
            <p className="text-sm text-slate-600">Manage teams, squads, customized CMS rule pages, and tournament details from a secure dashboard.</p>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
              Get in Touch
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Reach out directly to create your tournament workspace and receive your organizer credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a 
              href="tel:+919696920521"
              className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-[#00D084] hover:bg-slate-50/50 transition-all group"
            >
              <div className="p-3 bg-slate-100 group-hover:bg-[#00D084]/10 group-hover:text-[#00D084] text-slate-600 rounded-lg transition-colors flex-shrink-0">
                <Phone size={20} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Call or WhatsApp</span>
                <span className="block font-bold text-slate-900 truncate">+91 9696920521</span>
              </div>
            </a>

            <a 
              href="mailto:support@tournamentmgr.com"
              className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 hover:border-[#00D084] hover:bg-slate-50/50 transition-all group"
            >
              <div className="p-3 bg-slate-100 group-hover:bg-[#00D084]/10 group-hover:text-[#00D084] text-slate-600 rounded-lg transition-colors flex-shrink-0">
                <Mail size={20} />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Us</span>
                <span className="block font-bold text-slate-900 truncate">support@tournamentmgr.com</span>
              </div>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <span>TournamentMgr · © {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
