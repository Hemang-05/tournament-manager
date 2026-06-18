import { calculateStandings } from './standings';

export function getTeamPlaceholder(stage: string, slot: 'home' | 'away', allMatches: { stage: string }[] = []) {
  const stageLower = (stage || '').toLowerCase();
  
  if (stageLower.startsWith('quarter-final')) {
    const qfNumMatch = stageLower.match(/\d+/);
    const qfIndex = qfNumMatch ? parseInt(qfNumMatch[0]) - 1 : 0;
    
    // Check if there are R16 matches in the tournament
    const hasR16 = allMatches.some(m => m.stage?.toLowerCase().startsWith('round of 16'));
    if (hasR16) {
      return slot === 'home' 
        ? `Winner R16 Match ${qfIndex * 2 + 1}` 
        : `Winner R16 Match ${qfIndex * 2 + 2}`;
    } else {
      // League + KO Group to QF mapping:
      // QF 1: Winner Group A vs Runner-up Group B
      // QF 2: Winner Group C vs Runner-up Group D
      // QF 3: Winner Group B vs Runner-up Group A
      // QF 4: Winner Group D vs Runner-up Group C
      if (qfIndex === 0) return slot === 'home' ? 'Winner Group A' : 'Runner Group B';
      if (qfIndex === 1) return slot === 'home' ? 'Winner Group C' : 'Runner Group D';
      if (qfIndex === 2) return slot === 'home' ? 'Winner Group B' : 'Runner Group A';
      if (qfIndex === 3) return slot === 'home' ? 'Winner Group D' : 'Runner Group C';
    }
  }
  
  if (stageLower.startsWith('semi-final')) {
    const sfNumMatch = stageLower.match(/\d+/);
    const sfIndex = sfNumMatch ? parseInt(sfNumMatch[0]) - 1 : 0;
    
    // Check if there are QF matches in the tournament
    const hasQF = allMatches.some(m => m.stage?.toLowerCase().startsWith('quarter-final'));
    if (hasQF) {
      return slot === 'home' 
        ? `Winner QF ${sfIndex * 2 + 1}` 
        : `Winner QF ${sfIndex * 2 + 2}`;
    } else {
      // 2 groups (Group A, Group B) -> Semi-finals mapping
      // SF 1: Winner Group A vs Runner Group B
      // SF 2: Winner Group B vs Runner Group A
      if (sfIndex === 0) return slot === 'home' ? 'Winner Group A' : 'Runner Group B';
      if (sfIndex === 1) return slot === 'home' ? 'Winner Group B' : 'Runner Group A';
    }
  }
  
  if (stageLower === 'final') {
    return slot === 'home' ? 'Winner SF 1' : 'Winner SF 2';
  }
  
  return 'TBD';
}

// Progression map for knockout matches
export const PROGRESSION_MAP: Record<string, { targetStage: string; slot: 'home' | 'away' }> = {
  // Round of 16 progression
  'Round of 16 - Match 1': { targetStage: 'Quarter-final 1', slot: 'home' },
  'Round of 16 - Match 2': { targetStage: 'Quarter-final 1', slot: 'away' },
  'Round of 16 - Match 3': { targetStage: 'Quarter-final 2', slot: 'home' },
  'Round of 16 - Match 4': { targetStage: 'Quarter-final 2', slot: 'away' },
  'Round of 16 - Match 5': { targetStage: 'Quarter-final 3', slot: 'home' },
  'Round of 16 - Match 6': { targetStage: 'Quarter-final 3', slot: 'away' },
  'Round of 16 - Match 7': { targetStage: 'Quarter-final 4', slot: 'home' },
  'Round of 16 - Match 8': { targetStage: 'Quarter-final 4', slot: 'away' },
  
  // Quarter-finals progression
  'Quarter-final 1': { targetStage: 'Semi-final 1', slot: 'home' },
  'Quarter-final 2': { targetStage: 'Semi-final 1', slot: 'away' },
  'Quarter-final 3': { targetStage: 'Semi-final 2', slot: 'home' },
  'Quarter-final 4': { targetStage: 'Semi-final 2', slot: 'away' },

  // Semi-finals progression
  'Semi-final 1': { targetStage: 'Final', slot: 'home' },
  'Semi-final 2': { targetStage: 'Final', slot: 'away' },
};

export async function advanceKnockoutWinner(
  supabase: any,
  tournamentId: string,
  stage: string,
  winnerTeamId: string
) {
  const nextStep = PROGRESSION_MAP[stage];
  if (!nextStep) return;

  const updatePayload = nextStep.slot === 'home'
    ? { home_team_id: winnerTeamId }
    : { away_team_id: winnerTeamId };

  const { error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('tournament_id', tournamentId)
    .eq('stage', nextStep.targetStage);

  if (error) {
    console.error(`Failed to advance winner of ${stage} to ${nextStep.targetStage}:`, error.message);
  }
}

export async function resolveGroupPlayoffs(supabase: any, tournamentId: string) {
  try {
    // Fetch tournament format to verify
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('format, points_win, points_draw, points_loss')
      .eq('id', tournamentId)
      .single();

    if (tournament?.format !== 'league_knockout') return;

    // Fetch all teams
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId);

    // Fetch all matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (!teams || !matches) return;

    // Group teams by group_name
    const teamsByGroup: Record<string, any[]> = {};
    teams.forEach((t: any) => {
      if (t.group_name) {
        if (!teamsByGroup[t.group_name]) teamsByGroup[t.group_name] = [];
        teamsByGroup[t.group_name].push(t);
      }
    });

    const groupNames = Object.keys(teamsByGroup).sort();
    const groupStandings: Record<string, any[]> = {};

    groupNames.forEach(grpName => {
      const groupMatches = matches.filter((m: any) => m.stage === grpName);
      const grpTeams = teamsByGroup[grpName];
      const isCompleted = groupMatches.length > 0 && groupMatches.every((m: any) => m.status?.toLowerCase() === 'completed');

      if (isCompleted) {
        groupStandings[grpName] = calculateStandings(
          grpTeams,
          groupMatches,
          tournament.points_win ?? 2,
          tournament.points_draw ?? 1,
          tournament.points_loss ?? 0
        );
      }
    });

    // Fetch knockout matches
    const { data: koMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .in('stage', [
        'Semi-final 1',
        'Semi-final 2',
        'Quarter-final 1',
        'Quarter-final 2',
        'Quarter-final 3',
        'Quarter-final 4'
      ]);

    if (!koMatches || koMatches.length === 0) return;

    // Case 1: 2 groups (Semi-finals)
    if (groupNames.length === 2) {
      const grpA = groupStandings['Group A'];
      const grpB = groupStandings['Group B'];

      if (grpA && grpB) {
        // Semi-final 1: 1st Group A vs 2nd Group B
        const sf1 = koMatches.find((m: any) => m.stage === 'Semi-final 1');
        if (sf1 && (sf1.home_team_id !== grpA[0]?.team_id || sf1.away_team_id !== grpB[1]?.team_id)) {
          await supabase.from('matches').update({
            home_team_id: grpA[0]?.team_id || null,
            away_team_id: grpB[1]?.team_id || null
          }).eq('id', sf1.id);
        }

        // Semi-final 2: 1st Group B vs 2nd Group A
        const sf2 = koMatches.find((m: any) => m.stage === 'Semi-final 2');
        if (sf2 && (sf2.home_team_id !== grpB[0]?.team_id || sf2.away_team_id !== grpA[1]?.team_id)) {
          await supabase.from('matches').update({
            home_team_id: grpB[0]?.team_id || null,
            away_team_id: grpA[1]?.team_id || null
          }).eq('id', sf2.id);
        }
      }
    }

    // Case 2: 4 groups (Quarter-finals)
    if (groupNames.length === 4) {
      const grpA = groupStandings['Group A'];
      const grpB = groupStandings['Group B'];
      const grpC = groupStandings['Group C'];
      const grpD = groupStandings['Group D'];

      if (grpA && grpB && grpC && grpD) {
        // QF 1: 1st Group A vs 2nd Group B
        const qf1 = koMatches.find((m: any) => m.stage === 'Quarter-final 1');
        if (qf1 && (qf1.home_team_id !== grpA[0]?.team_id || qf1.away_team_id !== grpB[1]?.team_id)) {
          await supabase.from('matches').update({ home_team_id: grpA[0]?.team_id, away_team_id: grpB[1]?.team_id }).eq('id', qf1.id);
        }
        // QF 2: 1st Group C vs 2nd Group D
        const qf2 = koMatches.find((m: any) => m.stage === 'Quarter-final 2');
        if (qf2 && (qf2.home_team_id !== grpC[0]?.team_id || qf2.away_team_id !== grpD[1]?.team_id)) {
          await supabase.from('matches').update({ home_team_id: grpC[0]?.team_id, away_team_id: grpD[1]?.team_id }).eq('id', qf2.id);
        }
        // QF 3: 1st Group B vs 2nd Group A
        const qf3 = koMatches.find((m: any) => m.stage === 'Quarter-final 3');
        if (qf3 && (qf3.home_team_id !== grpB[0]?.team_id || qf3.away_team_id !== grpA[1]?.team_id)) {
          await supabase.from('matches').update({ home_team_id: grpB[0]?.team_id, away_team_id: grpA[1]?.team_id }).eq('id', qf3.id);
        }
        // QF 4: 1st Group D vs 2nd Group C
        const qf4 = koMatches.find((m: any) => m.stage === 'Quarter-final 4');
        if (qf4 && (qf4.home_team_id !== grpD[0]?.team_id || qf4.away_team_id !== grpC[1]?.team_id)) {
          await supabase.from('matches').update({ home_team_id: grpD[0]?.team_id, away_team_id: grpC[1]?.team_id }).eq('id', qf4.id);
        }
      }
    }
  } catch (err: any) {
    console.error('Error in resolveGroupPlayoffs:', err.message);
  }
}
