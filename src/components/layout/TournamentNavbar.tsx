'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface CMSPage {
  title: string;
  slug: string;
}

interface TournamentNavbarProps {
  tournament: {
    id: string;
    slug: string;
    name: string;
    sport: string | null;
    format?: string | null;
  };
  cmsPages: CMSPage[];
}

const SPORT_EMOJI: Record<string, string> = {
  Football: '⚽',
  Cricket: '🏏',
  Basketball: '🏀',
  Pickleball: '🏓',
  Other: '🎯',
};

export default function TournamentNavbar({ tournament, cmsPages }: TournamentNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const emoji = SPORT_EMOJI[tournament.sport || 'Other'] || '🎯';

  const baseLinks = [
    { name: 'Table', href: `/t/${tournament.slug}/table` },
    { name: 'Fixtures', href: `/t/${tournament.slug}/fixtures` },
    { name: 'Results', href: `/t/${tournament.slug}/results` },
    ...(tournament.format === 'Knockout' || tournament.format === 'League + Knockout' || tournament.format === 'knockout' || tournament.format === 'league_knockout'
      ? [{ name: 'Bracket', href: `/t/${tournament.slug}/bracket` }]
      : []),
    { name: 'Teams', href: `/t/${tournament.slug}/teams` },
    { name: 'Scorers', href: `/t/${tournament.slug}/scorers` },
    { name: 'Discipline', href: `/t/${tournament.slug}/discipline` },
  ];

  const cmsLinks = cmsPages.map(page => ({
    name: page.title,
    href: `/t/${tournament.slug}/${page.slug}`,
  }));

  const allLinks = [...baseLinks, ...cmsLinks];

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0A1628] border-b border-white/10 shadow-lg shadow-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand/Logo */}
          <div className="flex flex-shrink-0 items-center">
            <Link
              href={`/t/${tournament.slug}`}
              className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="text-2xl" role="img" aria-label="sport emoji">
                {emoji}
              </span>
              <span
                className="text-lg font-bold tracking-tight text-white sm:text-xl truncate max-w-[200px] sm:max-w-xs"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {tournament.name}
              </span>
            </Link>
          </div>

          {/* Right: Desktop Links */}
          <div className="hidden lg:flex lg:items-center lg:gap-1 h-full overflow-x-auto">
            {allLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex h-16 items-center px-3 text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{link.name}</span>
                  {/* Pitch green bottom border highlight */}
                  <span
                    className={`absolute bottom-0 left-0 h-[3px] w-full bg-[#00D084] transition-transform duration-300 origin-bottom ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#00D084] transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div
        className={`lg:hidden overflow-y-auto transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[400px] border-t border-white/10 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-1 px-2 pb-3 pt-2 bg-[#0A1628]">
          {allLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`relative block rounded-lg px-4 py-3 text-base font-semibold transition-colors ${
                  isActive
                    ? 'text-[#00D084] bg-white/5 font-bold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{link.name}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#00D084]" />}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
