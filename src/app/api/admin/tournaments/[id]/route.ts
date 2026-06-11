import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionFromCookies } from '@/lib/auth';
import { uiToDbSport, uiToDbFormat } from '@/lib/tournament';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const session = await getSessionFromCookies();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organiserId = session.id as string;
    const tournamentId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify ownership
    const { data: existing } = await supabase
      .from('tournaments')
      .select('organiser_id')
      .eq('id', tournamentId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (existing.organiser_id !== organiserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract updatable fields
    const body = await request.json();
    const allowedFields = [
      'name', 'slug', 'sport', 'sport_custom', 'format',
      'start_date', 'end_date', 'venue_name', 'match_days',
      'max_matches_per_day', 'max_teams', 'rules_content',
      'is_public', 'status', 'players_per_team', 'points_win',
      'points_draw', 'points_loss',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'sport') {
          updates[field] = uiToDbSport(body[field]);
        } else if (field === 'format') {
          updates[field] = uiToDbFormat(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // If slug is being updated, check uniqueness
    if (updates.slug) {
      const { data: slugConflict } = await supabase
        .from('tournaments')
        .select('id')
        .eq('slug', updates.slug as string)
        .neq('id', tournamentId)
        .single();

      if (slugConflict) {
        return NextResponse.json({ error: 'Slug is already taken' }, { status: 409 });
      }
    }

    const { error: updateError } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', tournamentId);

    if (updateError) {
      console.error('Tournament update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update tournament' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Tournament update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const session = await getSessionFromCookies();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organiserId = session.id as string;
    const tournamentId = params.id;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify ownership
    const { data: existing } = await supabase
      .from('tournaments')
      .select('organiser_id')
      .eq('id', tournamentId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    if (existing.organiser_id !== organiserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Programmatically delete dependencies to avoid constraint violations
    // 1. Delete match events
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId);
      
    const matchIds = (matches || []).map(m => m.id);
    if (matchIds.length > 0) {
      await supabase.from('match_events').delete().in('match_id', matchIds);
    }

    // 2. Delete matches
    await supabase.from('matches').delete().eq('tournament_id', tournamentId);

    // 3. Delete players
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId);
      
    const teamIds = (teams || []).map(t => t.id);
    if (teamIds.length > 0) {
      await supabase.from('players').delete().in('team_id', teamIds);
    }

    // 4. Delete teams
    await supabase.from('teams').delete().eq('tournament_id', tournamentId);

    // 5. Delete pages
    await supabase.from('pages').delete().eq('tournament_id', tournamentId);

    // 6. Delete tournament itself
    const { error: deleteError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', tournamentId);

    if (deleteError) {
      console.error('Tournament delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 });
    }

    // 7. Delete the associated organiser
    await supabase.from('organisers').delete().eq('id', organiserId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Tournament delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

