// Client-safe tournament utilities and mappings

// Mappings for Sport
const SPORT_MAP_TO_UI: Record<string, string> = {
  football: 'Football',
  cricket: 'Cricket',
  basketball: 'Basketball',
  pickleball: 'Pickleball',
  other: 'Other',
};

const SPORT_MAP_TO_DB: Record<string, string> = {
  Football: 'football',
  Cricket: 'cricket',
  Basketball: 'basketball',
  Pickleball: 'pickleball',
  Other: 'other',
};

// Mappings for Format
const FORMAT_MAP_TO_UI: Record<string, string> = {
  league: 'League',
  knockout: 'Knockout',
  league_knockout: 'League + Knockout',
};

const FORMAT_MAP_TO_DB: Record<string, string> = {
  League: 'league',
  Knockout: 'knockout',
  'League + Knockout': 'league_knockout',
};

export function dbToUiSport(sport: string | null | undefined): string {
  if (!sport) return 'Other';
  return SPORT_MAP_TO_UI[sport.toLowerCase()] || sport;
}

export function uiToDbSport(sport: string | null | undefined): string {
  if (!sport) return 'other';
  return SPORT_MAP_TO_DB[sport] || sport.toLowerCase();
}

export function dbToUiFormat(format: string | null | undefined): string {
  if (!format) return 'League';
  return FORMAT_MAP_TO_UI[format.toLowerCase()] || format;
}

export function uiToDbFormat(format: string | null | undefined): string {
  if (!format) return 'league';
  return FORMAT_MAP_TO_DB[format] || format.toLowerCase();
}

export function mapTournamentDbToUi<T extends { sport?: string | null; format?: string | null }>(t: T | null | undefined): T | null {
  if (!t) return null;
  return {
    ...t,
    sport: t.sport ? dbToUiSport(t.sport) : t.sport,
    format: t.format ? dbToUiFormat(t.format) : t.format,
  };
}

export function getDisplayStatus(status: string | null | undefined, startDate?: string | null): 'Live' | 'Upcoming' | 'Completed' {
  const currentStatus = (status || 'draft').toLowerCase();
  if (currentStatus === 'completed') return 'Completed';
  if (currentStatus === 'active') return 'Live';
  
  if (startDate) {
    // IST is UTC + 5:30
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDateStr = new Date(utcTime + istOffset).toISOString().split('T')[0];
    
    if (istDateStr >= startDate) {
      return 'Live';
    }
  }
  
  return 'Upcoming';
}

