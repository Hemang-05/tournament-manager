import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tournamentId, format, groups, fixtures } = body;

    if (!tournamentId) return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    if (!format) return NextResponse.json({ error: 'Missing format' }, { status: 400 });
    if (!fixtures || !Array.isArray(fixtures)) return NextResponse.json({ error: 'Missing or invalid fixtures' }, { status: 400 });

    // Auth check
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update tournament format in DB
    const { error: formatError } = await supabase
      .from('tournaments')
      .update({ format })
      .eq('id', tournamentId);

    if (formatError) throw new Error(formatError.message);

    // 2. If groups are provided, update team group assignments
    if (groups && typeof groups === 'object') {
      for (const [teamId, groupName] of Object.entries(groups)) {
        const { error: teamError } = await supabase
          .from('teams')
          .update({ group_name: groupName || null })
          .eq('id', teamId);

        if (teamError) throw new Error(teamError.message);
      }
    } else {
      // Clear groups if not group format
      const { error: teamError } = await supabase
        .from('teams')
        .update({ group_name: null })
        .eq('tournament_id', tournamentId);

      if (teamError) throw new Error(teamError.message);
    }

    // 3. Clear existing matches for this tournament
    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (deleteError) throw new Error(deleteError.message);

    // 4. Bulk insert new fixtures
    const toInsert = fixtures.map(f => ({
      tournament_id: tournamentId,
      home_team_id: f.home_team_id,
      away_team_id: f.away_team_id,
      match_date: f.match_date,
      kick_off_time: f.kick_off_time || '12:00',
      status: (f.status || 'scheduled').toLowerCase(),
      matchday: f.matchday || 1,
      stage: f.stage || 'League',
    }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('matches')
        .insert(toInsert);

      if (insertError) throw new Error(insertError.message);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Fixture save error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
