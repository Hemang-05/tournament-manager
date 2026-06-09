"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface PublicNavbarProps {
  tournamentName: string;
}

export default function PublicNavbar({ tournamentName }: PublicNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Table", href: "/table" },
    { name: "Fixtures", href: "/fixtures" },
    { name: "Results", href: "/results" },
    { name: "Teams", href: "/teams" },
    { name: "Scorers", href: "/scorers" },
    { name: "Discipline", href: "/discipline" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0A1628] border-b border-white/10 shadow-lg shadow-black/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand / Logo */}
          <div className="flex flex-shrink-0 items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <span className="text-2xl" role="img" aria-label="football">
                ⚽
              </span>
              <span 
                className="text-lg font-bold tracking-tight text-white sm:text-xl"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {tournamentName}
              </span>
            </Link>
          </div>

          {/* Right: Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center md:gap-1 h-full">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex h-16 items-center px-4 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{link.name}</span>
                  {/* Pitch green bottom border highlight */}
                  <span
                    className={`absolute bottom-0 left-0 h-[3px] w-full bg-[#00D084] transition-transform duration-300 origin-bottom ${
                      isActive ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#00D084] transition-colors"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
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
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-[350px] border-t border-white/10 opacity-100" : "max-h-0 opacity-0"
        }`}
        id="mobile-menu"
      >
        <div className="space-y-1 px-2 pb-3 pt-2 bg-[#0A1628]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`relative block rounded-lg px-4 py-3 text-base font-semibold transition-colors ${
                  isActive
                    ? "text-[#00D084] bg-white/5"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{link.name}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00D084]" />
                  )}
                </div>
                {/* Visual bottom border line under active item in mobile if desired, or left border */}
                {isActive && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#00D084]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
