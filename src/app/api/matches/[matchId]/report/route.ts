import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSessionFromCookies } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: { matchId: string } }) {
  try {
    // Auth check
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch match
    const { data: match } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:home_team_id (name),
        away_team:away_team_id (name),
        motm:motm_player_id (name)
      `)
      .eq('id', params.matchId)
      .single();

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // Fetch events
    const { data: events } = await supabase
      .from('match_events')
      .select(`
        *,
        player:player_id (name)
      `)
      .eq('match_id', params.matchId)
      .order('minute', { ascending: true });

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const eventsText = events?.length 
      ? events.map((e: any) => `- ${e.type || e.event_type || 'Event'}: ${e.player?.name || 'Unknown Player'}`).join('\n')
      : 'No notable events recorded.';

    const prompt = `
Write a short, engaging football match report (about 150 words) in past tense.
Match: ${(match.home_team as any)?.name} vs ${(match.away_team as any)?.name}
Final Score: ${match.home_score ?? 0} - ${match.away_score ?? 0}

Match Events:
${eventsText}

Man of the Match: ${(match.motm as any)?.name || 'Not awarded'}

Return only the report text without any intro or markdown tags unless it's basic formatting like bolding.
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Save to match
    await supabase.from('matches').update({ ai_report: text }).eq('id', params.matchId);

    return NextResponse.json({ report: text });

  } catch (error: any) {
    console.error('AI Report error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
