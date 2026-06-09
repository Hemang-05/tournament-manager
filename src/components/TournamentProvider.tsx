'use client';

import React, { createContext, useContext } from 'react';

export interface TournamentContextType {
  id: string;
  slug: string;
  sport: string | null;
  name: string;
  format: string;
  status: string;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({
  children,
  tournament,
}: {
  children: React.ReactNode;
  tournament: TournamentContextType;
}) {
  return (
    <TournamentContext.Provider value={tournament}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
