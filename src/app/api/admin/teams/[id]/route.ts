import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionFromCookies } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromCookies();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify team ownership
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .select('tournament_id, tournaments:tournament_id ( organiser_id )')
      .eq('id', params.id)
      .single();

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    const orgId = (team.tournaments as any)?.organiser_id;
    if (orgId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get player IDs for this team
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('team_id', params.id);
    const playerIds = teamPlayers ? teamPlayers.map(p => p.id) : [];

    // Get match IDs involving this team
    const { data: teamMatches } = await supabase
      .from('matches')
      .select('id')
      .or(`home_team_id.eq.${params.id},away_team_id.eq.${params.id}`);
    const matchIds = teamMatches ? teamMatches.map(m => m.id) : [];

    // Delete match events
    if (matchIds.length > 0) {
      await supabase.from('match_events').delete().in('match_id', matchIds);
    }
    if (playerIds.length > 0) {
      await supabase.from('match_events').delete().in('player_id', playerIds);
    }

    // Nullify Man of the Match references in other matches for these players
    if (playerIds.length > 0) {
      await supabase.from('matches').update({ motm_player_id: null }).in('motm_player_id', playerIds);
    }

    // Delete matches involving the team
    if (matchIds.length > 0) {
      await supabase.from('matches').delete().in('id', matchIds);
    }

    // Delete players
    await supabase.from('players').delete().eq('team_id', params.id);

    // Delete team itself
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Team delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
