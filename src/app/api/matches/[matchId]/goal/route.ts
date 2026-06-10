import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/matches/[matchId]/goal
 *
 * Logs a match event (goal, own goal, yellow card, red card, assist) and
 * updates the match score + player stats accordingly.
 *
 * Body: { player_id, event_type, minute, team_id }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    let { player_id, event_type, minute, team_id } = body;

    if (minute === undefined || minute === null) {
      minute = 1;
    }

    if (!player_id || !event_type) {
      return NextResponse.json(
        { error: 'player_id and event_type are required' },
        { status: 400 }
      );
    }

    // 1. Insert the match event
    const dbType = event_type.toLowerCase().replace(/\s+/g, '_');
    const { data: event, error: eventError } = await supabase
      .from('match_events')
      .insert({
        match_id: params.matchId,
        player_id,
        type: dbType,
        minute: parseInt(minute),
      })
      .select('*, player:player_id(name, team_id)')
      .single();

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    // 2. Fetch the match to know team sides
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, home_score, away_score')
      .eq('id', params.matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const eventTypeLower = event_type.toLowerCase();

    // 3. Update match score for goal events
    if (eventTypeLower === 'goal' || eventTypeLower === 'own goal') {
      let scoreUpdate: { home_score?: number; away_score?: number } = {};

      if (eventTypeLower === 'goal') {
        // Regular goal — team_id determines which side scores
        if (team_id === match.home_team_id) {
          scoreUpdate = { home_score: (match.home_score || 0) + 1 };
        } else {
          scoreUpdate = { away_score: (match.away_score || 0) + 1 };
        }
      } else {
        // Own goal — opposite team gets the score
        if (team_id === match.home_team_id) {
          scoreUpdate = { away_score: (match.away_score || 0) + 1 };
        } else {
          scoreUpdate = { home_score: (match.home_score || 0) + 1 };
        }
      }

      await supabase
        .from('matches')
        .update(scoreUpdate)
        .eq('id', params.matchId);

      // 4. Update player goals_scored for regular goals
      if (eventTypeLower === 'goal') {
        // Increment goals_scored on the player
        const { data: player } = await supabase
          .from('players')
          .select('goals_scored')
          .eq('id', player_id)
          .single();

        if (player) {
          await supabase
            .from('players')
            .update({ goals_scored: (player.goals_scored || 0) + 1 })
            .eq('id', player_id);
        }
      }
    }

    // 5. Update player card counts for card events
    if (eventTypeLower === 'yellow card') {
      const { data: player } = await supabase
        .from('players')
        .select('yellow_cards')
        .eq('id', player_id)
        .single();

      if (player) {
        await supabase
          .from('players')
          .update({ yellow_cards: (player.yellow_cards || 0) + 1 })
          .eq('id', player_id);
      }
    }

    if (eventTypeLower === 'red card') {
      const { data: player } = await supabase
        .from('players')
        .select('red_cards')
        .eq('id', player_id)
        .single();

      if (player) {
        await supabase
          .from('players')
          .update({ red_cards: (player.red_cards || 0) + 1 })
          .eq('id', player_id);
      }
    }

    // 6. Return updated match state
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status')
      .eq('id', params.matchId)
      .single();

    return NextResponse.json({
      event,
      match: updatedMatch,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/matches/[matchId]/goal
 *
 * Removes a match event and adjusts the score/player stats accordingly.
 *
 * Body: { event_id, player_id, event_type, team_id }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { event_id, player_id, event_type, team_id } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Get match
    const { data: match } = await supabase
      .from('matches')
      .select('id, home_team_id, away_team_id, home_score, away_score')
      .eq('id', params.matchId)
      .single();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Delete the event
    const { error: deleteError } = await supabase
      .from('match_events')
      .delete()
      .eq('id', event_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const eventTypeLower = event_type?.toLowerCase().replace(/_/g, ' ');

    // Reverse score changes
    if (eventTypeLower === 'goal') {
      if (team_id === match.home_team_id) {
        await supabase.from('matches').update({ home_score: Math.max(0, (match.home_score || 0) - 1) }).eq('id', params.matchId);
      } else {
        await supabase.from('matches').update({ away_score: Math.max(0, (match.away_score || 0) - 1) }).eq('id', params.matchId);
      }

      // Decrement player goals
      if (player_id) {
        const { data: player } = await supabase.from('players').select('goals_scored').eq('id', player_id).single();
        if (player) {
          await supabase.from('players').update({ goals_scored: Math.max(0, (player.goals_scored || 0) - 1) }).eq('id', player_id);
        }
      }
    } else if (eventTypeLower === 'own goal') {
      if (team_id === match.home_team_id) {
        await supabase.from('matches').update({ away_score: Math.max(0, (match.away_score || 0) - 1) }).eq('id', params.matchId);
      } else {
        await supabase.from('matches').update({ home_score: Math.max(0, (match.home_score || 0) - 1) }).eq('id', params.matchId);
      }
    } else if (eventTypeLower === 'yellow card' && player_id) {
      const { data: player } = await supabase.from('players').select('yellow_cards').eq('id', player_id).single();
      if (player) {
        await supabase.from('players').update({ yellow_cards: Math.max(0, (player.yellow_cards || 0) - 1) }).eq('id', player_id);
      }
    } else if (eventTypeLower === 'red card' && player_id) {
      const { data: player } = await supabase.from('players').select('red_cards').eq('id', player_id).single();
      if (player) {
        await supabase.from('players').update({ red_cards: Math.max(0, (player.red_cards || 0) - 1) }).eq('id', player_id);
      }
    }

    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('id, home_score, away_score, status')
      .eq('id', params.matchId)
      .single();

    return NextResponse.json({ match: updatedMatch });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
