import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { mapTournamentDbToUi } from '@/lib/tournament';

// Helper to generate round-robin matches
function generateRoundRobin(teams: any[], stageName: string) {
  const list = [...teams];
  if (list.length % 2 !== 0) {
    // Add dummy bye team
    list.push({ id: null, name: 'BYE' });
  }

  const rounds = list.length - 1;
  const matchesPerRound = list.length / 2;
  const fixtures = [];

  for (let r = 0; r < rounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const home = list[(r + m) % (list.length - 1)];
      const away = m === 0 ? list[list.length - 1] : list[(r + list.length - 1 - m) % (list.length - 1)];

      if (home.id && away.id) {
        fixtures.push({
          home_team_id: home.id,
          away_team_id: away.id,
          matchday: r + 1,
          stage: stageName,
        });
      }
    }
  }
  return fixtures;
}

// Scheduling algorithm to assign dates and kick-off times sequentially
function assignDatesAndTimes(
  fixtures: any[],
  startDateStr: string | null,
  endDateStr: string | null,
  matchDays: string[] | null,
  startTime: string,
  endTime: string,
  matchDuration: number,
  bufferTime: number = 5
) {
  let currentDate = new Date(startDateStr || new Date().toISOString().split('T')[0]);
  const allowedDays = (matchDays || ['Sat', 'Sun']).map(d => d.toLowerCase());
  
  const DAY_MAP: Record<string, number> = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
  };
  const allowedDayNums = allowedDays.map(d => DAY_MAP[d]).filter(n => n !== undefined);
  
  if (allowedDayNums.length === 0) {
    for (let i = 0; i < 7; i++) allowedDayNums.push(i);
  }

  const advanceToNextMatchDay = (date: Date) => {
    const next = new Date(date);
    do {
      next.setDate(next.getDate() + 1);
    } while (!allowedDayNums.includes(next.getDay()));
    return next;
  };

  if (!allowedDayNums.includes(currentDate.getDay())) {
    currentDate = advanceToNextMatchDay(currentDate);
  }

  // Parse start/end hours and minutes
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const dailyStartMinutes = startH * 60 + startM;
  const dailyEndMinutes = endH * 60 + endM;

  let currentMinutes = dailyStartMinutes;

  return fixtures.map(fixture => {
    // If the match does not fit in the daily window, roll over to the next match day
    if (currentMinutes + matchDuration > dailyEndMinutes) {
      currentDate = advanceToNextMatchDay(currentDate);
      currentMinutes = dailyStartMinutes;
    }

    const dateStr = currentDate.toISOString().split('T')[0];
    const hh = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
    const mm = String(currentMinutes % 60).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    // Increment minutes by match duration and 5 minutes buffer
    currentMinutes += matchDuration + bufferTime;

    return {
      ...fixture,
      match_date: dateStr,
      kick_off_time: timeStr,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      tournamentId, 
      format, 
      groups, 
      advancementCount = 2,
      startTime = '09:00',
      endTime = '18:00',
      matchDuration = 20
    } = body;
    
    if (!tournamentId) return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    if (!format) return NextResponse.json({ error: 'Missing format' }, { status: 400 });

    // Auth check
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch tournament details
    const { data: rawTournament } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (!rawTournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

    const tournament = mapTournamentDbToUi(rawTournament)!;

    // Fetch teams
    const { data: fetchedTeams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId);

    const teams = fetchedTeams || [];
    if (teams.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 teams to generate fixtures' }, { status: 400 });
    }

    let generatedMatches: any[] = [];

    if (format === 'league') {
      // Standard Round Robin for all teams
      const rawFixtures = generateRoundRobin(teams, 'League');
      generatedMatches = assignDatesAndTimes(
        rawFixtures,
        tournament.start_date,
        tournament.end_date,
        tournament.match_days,
        startTime,
        endTime,
        Number(matchDuration)
      );
    } else if (format === 'knockout') {
      // Pure Knockout bracket
      // 1. Determine starting round based on number of teams
      // If N <= 4: Semi-finals, If N <= 8: Quarter-finals, If N <= 16: Round of 16, else Round of 32
      let startingStage = 'Quarter-finals';
      let roundsCount = 4; // number of matches in starting stage
      
      if (teams.length <= 4) {
        startingStage = 'Semi-finals';
        roundsCount = 2;
      } else if (teams.length <= 8) {
        startingStage = 'Quarter-finals';
        roundsCount = 4;
      } else if (teams.length <= 16) {
        startingStage = 'Round of 16';
        roundsCount = 8;
      } else {
        startingStage = 'Round of 32';
        roundsCount = 16;
      }

      // Shuffle teams randomly to create pairings
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const firstRoundMatches: any[] = [];

      for (let i = 0; i < roundsCount; i++) {
        const homeTeam = shuffledTeams[i * 2] || null;
        const awayTeam = shuffledTeams[i * 2 + 1] || null;

        firstRoundMatches.push({
          home_team_id: homeTeam ? homeTeam.id : null,
          away_team_id: awayTeam ? awayTeam.id : null,
          matchday: 1,
          stage: startingStage === 'Quarter-finals' ? `Quarter-final ${i + 1}` :
                 startingStage === 'Semi-finals' ? `Semi-final ${i + 1}` :
                 startingStage === 'Round of 16' ? `Round of 16 - Match ${i + 1}` :
                 `Round of 32 - Match ${i + 1}`,
        });
      }

      // Subsequent rounds are empty placeholders
      const subsequentMatches: any[] = [];
      let nextRoundsCount = roundsCount / 2;
      let nextStage = '';
      let matchday = 2;

      while (nextRoundsCount >= 1) {
        if (nextRoundsCount === 4) nextStage = 'Quarter-final';
        else if (nextRoundsCount === 2) nextStage = 'Semi-final';
        else if (nextRoundsCount === 1) nextStage = 'Final';
        else nextStage = 'Round of 16 - Match';

        for (let i = 0; i < nextRoundsCount; i++) {
          subsequentMatches.push({
            home_team_id: null,
            away_team_id: null,
            matchday: matchday,
            stage: nextStage === 'Final' ? 'Final' : `${nextStage} ${i + 1}`,
          });
        }

        nextRoundsCount /= 2;
        matchday++;
      }

      const allKnockoutMatches = [...firstRoundMatches, ...subsequentMatches];
      generatedMatches = assignDatesAndTimes(
        allKnockoutMatches,
        tournament.start_date,
        tournament.end_date,
        tournament.match_days,
        startTime,
        endTime,
        Number(matchDuration)
      );
    } else if (format === 'league_knockout') {
      // Group Stage then Knockout
      if (!groups) {
        return NextResponse.json({ error: 'Group assignments are required for Group + KO format' }, { status: 400 });
      }

      // Group teams by their assigned group name
      const teamsByGroup: Record<string, any[]> = {};
      teams.forEach(t => {
        const grpName = groups[t.id];
        if (!grpName) return;
        if (!teamsByGroup[grpName]) teamsByGroup[grpName] = [];
        teamsByGroup[grpName].push(t);
      });

      const groupNames = Object.keys(teamsByGroup).sort();
      let groupStageMatches: any[] = [];

      // Generate round robin matches for each group
      groupNames.forEach(grpName => {
        const groupTeams = teamsByGroup[grpName];
        if (groupTeams.length >= 2) {
          const groupFixtures = generateRoundRobin(groupTeams, grpName);
          groupStageMatches = [...groupStageMatches, ...groupFixtures];
        }
      });

      // Schedule group stage matches
      const scheduledGroupMatches = assignDatesAndTimes(
        groupStageMatches,
        tournament.start_date,
        tournament.end_date,
        tournament.match_days,
        startTime,
        endTime,
        Number(matchDuration)
      );

      // Find the last date of group stage to schedule knockouts after
      let lastGroupDateStr = tournament.start_date || new Date().toISOString().split('T')[0];
      if (scheduledGroupMatches.length > 0) {
        lastGroupDateStr = scheduledGroupMatches[scheduledGroupMatches.length - 1].match_date;
      }

      // Determine knockout stage size based on number of groups and advancement count
      const advancingCount = Number(advancementCount);
      const totalAdvancing = groupNames.length * advancingCount;

      let nextStage = 'Semi-finals';
      let roundsCount = 2; // Semi-finals count

      if (totalAdvancing <= 2) {
        nextStage = 'Final';
        roundsCount = 1;
      } else if (totalAdvancing <= 4) {
        nextStage = 'Semi-finals';
        roundsCount = 2;
      } else if (totalAdvancing <= 8) {
        nextStage = 'Quarter-finals';
        roundsCount = 4;
      } else {
        nextStage = 'Round of 16';
        roundsCount = 8;
      }

      const knockoutMatches: any[] = [];
      let matchday = Math.max(...scheduledGroupMatches.map(m => m.matchday || 1), 0) + 1;

      // First knockout round slots
      for (let i = 0; i < roundsCount; i++) {
        let placeholderHome = null;
        let placeholderAway = null;

        if (nextStage === 'Quarter-finals') {
          if (i === 0) { placeholderHome = 'Winner Group A'; placeholderAway = 'Runner Group B'; }
          else if (i === 1) { placeholderHome = 'Winner Group C'; placeholderAway = 'Runner Group D'; }
          else if (i === 2) { placeholderHome = 'Winner Group B'; placeholderAway = 'Runner Group A'; }
          else if (i === 3) { placeholderHome = 'Winner Group D'; placeholderAway = 'Runner Group C'; }
        } else if (nextStage === 'Semi-finals') {
          if (totalAdvancing <= 4) {
            if (i === 0) { placeholderHome = 'Winner Group A'; placeholderAway = 'Runner Group B'; }
            else if (i === 1) { placeholderHome = 'Winner Group B'; placeholderAway = 'Runner Group A'; }
          } else {
            placeholderHome = `Winner QF ${i * 2 + 1}`;
            placeholderAway = `Winner QF ${i * 2 + 2}`;
          }
        } else if (nextStage === 'Final') {
          placeholderHome = 'Winner SF 1';
          placeholderAway = 'Winner SF 2';
        }

        knockoutMatches.push({
          home_team_id: null,
          away_team_id: null,
          matchday: matchday,
          stage: nextStage === 'Quarter-finals' ? `Quarter-final ${i + 1}` :
                 nextStage === 'Semi-finals' ? `Semi-final ${i + 1}` :
                 nextStage === 'Final' ? 'Final' :
                 `Round of 16 - Match ${i + 1}`,
          placeholder_home: placeholderHome,
          placeholder_away: placeholderAway,
        });
      }

      // Remaining knockout rounds
      let nextRoundsCount = roundsCount / 2;
      let nextRoundStageName = '';
      while (nextRoundsCount >= 1) {
        matchday++;
        if (nextRoundsCount === 4) nextRoundStageName = 'Quarter-final';
        else if (nextRoundsCount === 2) nextRoundStageName = 'Semi-final';
        else if (nextRoundsCount === 1) nextRoundStageName = 'Final';

        for (let i = 0; i < nextRoundsCount; i++) {
          let placeholderHome = null;
          let placeholderAway = null;

          if (nextRoundStageName === 'Semi-final') {
            placeholderHome = `Winner QF ${i * 2 + 1}`;
            placeholderAway = `Winner QF ${i * 2 + 2}`;
          } else if (nextRoundStageName === 'Final') {
            placeholderHome = `Winner SF 1`;
            placeholderAway = `Winner SF 2`;
          }

          knockoutMatches.push({
            home_team_id: null,
            away_team_id: null,
            matchday: matchday,
            stage: nextRoundStageName === 'Final' ? 'Final' : `${nextRoundStageName} ${i + 1}`,
            placeholder_home: placeholderHome,
            placeholder_away: placeholderAway,
          });
        }
        nextRoundsCount /= 2;
      }

      // Schedule knockout matches to start after group stage ends
      const nextDay = new Date(lastGroupDateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      const scheduledKnockoutMatches = assignDatesAndTimes(
        knockoutMatches,
        nextDay.toISOString().split('T')[0],
        tournament.end_date,
        tournament.match_days,
        startTime,
        endTime,
        Number(matchDuration)
      );

      generatedMatches = [...scheduledGroupMatches, ...scheduledKnockoutMatches];
    }

    return NextResponse.json({ fixtures: generatedMatches });

  } catch (error: any) {
    console.error('Fixture generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
