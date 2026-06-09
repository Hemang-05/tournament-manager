import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionFromCookies } from '@/lib/auth';
import { uiToDbSport, uiToDbFormat } from '@/lib/tournament';

export async function POST(request: Request) {
  try {
    // Auth check — must be logged in
    const session = await getSessionFromCookies();
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organiserId = session.id as string;

    const {
      name,
      slug: requestedSlug,
      sport,
      sport_custom,
      players_per_team,
      start_date,
      end_date,
      venue_name,
      match_days,
      max_matches_per_day,
      max_teams,
      rules_content,
      is_public,
    } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 });
    }

    if (!players_per_team || isNaN(Number(players_per_team)) || Number(players_per_team) <= 0) {
      return NextResponse.json({ error: 'Players per team is required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate slug
    let slug = requestedSlug?.trim();

    if (!slug) {
      // Auto-generate from name
      slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    }

    // Ensure slug uniqueness
    let finalSlug = slug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('tournaments')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (!existing) break;

      counter++;
      finalSlug = `${slug}-${counter}`;
    }

    // Insert tournament
    const { data: tournament, error: insertError } = await supabase
      .from('tournaments')
      .insert({
        organiser_id: organiserId,
        name,
        slug: finalSlug,
        sport: uiToDbSport(sport),
        sport_custom: sport_custom || null,
        format: 'league',
        players_per_team: Number(players_per_team),
        start_date: start_date || null,
        end_date: end_date || null,
        venue_name: venue_name || null,
        match_days: match_days || [],
        max_matches_per_day: max_matches_per_day || 4,
        max_teams: max_teams || 8,
        rules_content: rules_content || null,
        is_public: is_public !== undefined ? is_public : true,
        status: 'draft',
      })
      .select('id, slug')
      .single();

    if (insertError) {
      console.error('Tournament create error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create tournament' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      tournament: { id: tournament.id, slug: tournament.slug },
    });
  } catch (error) {
    console.error('Tournament create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
