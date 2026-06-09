export interface StandingRow {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  group_name: string | null;
}

export function calculateStandings(
  teams: any[],
  matches: any[],
  pointsWin = 2,
  pointsDraw = 1,
  pointsLoss = 0
): StandingRow[] {
  const standingsMap: Record<string, StandingRow> = {};

  // Initialize standings for all teams
  teams.forEach(team => {
    standingsMap[team.id] = {
      team_id: team.id,
      team_name: team.name,
      logo_url: team.logo_url || null,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      group_name: team.group_name || null,
    };
  });

  // Calculate statistics from completed matches
  matches.forEach(match => {
    // Only calculate for completed matches with valid scores
    if (match.status?.toLowerCase() !== 'completed') return;
    if (match.home_score === null || match.home_score === undefined) return;
    if (match.away_score === null || match.away_score === undefined) return;

    const home = standingsMap[match.home_team_id];
    const away = standingsMap[match.away_team_id];

    // If one of the teams is not in our list, skip
    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.gf += match.home_score;
    home.ga += match.away_score;

    away.gf += match.away_score;
    away.ga += match.home_score;

    if (match.home_score > match.away_score) {
      home.won += 1;
      home.points += pointsWin;

      away.lost += 1;
      away.points += pointsLoss;
    } else if (match.home_score < match.away_score) {
      away.won += 1;
      away.points += pointsWin;

      home.lost += 1;
      home.points += pointsLoss;
    } else {
      home.drawn += 1;
      home.points += pointsDraw;

      away.drawn += 1;
      away.points += pointsDraw;
    }
  });

  // Compute goal difference and convert map to array
  const standings = Object.values(standingsMap).map(row => {
    row.gd = row.gf - row.ga;
    return row;
  });

  // Sort standings: Points desc, Goal Difference desc, Goals For desc, Name asc
  return standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team_name.localeCompare(b.team_name);
  });
}
