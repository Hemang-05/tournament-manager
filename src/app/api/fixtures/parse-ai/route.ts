import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSessionFromCookies } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server. Please add it to your .env.local file to enable AI parsing.'
      }, { status: 400 });
    }

    const { text, image, mimeType, teamNames } = await request.json();

    if (!text && !image) {
      return NextResponse.json({ error: 'Please provide either text or an image to parse.' }, { status: 400 });
    }

    if (!teamNames || !Array.isArray(teamNames)) {
      return NextResponse.json({ error: 'Missing registered team names list.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
You are a tournament management helper. Your job is to extract match fixtures from the provided data (which could be a pasted plain text list or an image showing a fixtures table, spreadsheet screenshot, or whiteboard).

Here is the official list of registered team names in this tournament:
${JSON.stringify(teamNames)}

Please parse the input and extract all matches. You MUST return a valid JSON array of match objects. Each object MUST have the following schema:
{
  "home_team_name": "Exact name of the home team from the registered list, or 'TBD' if not decided",
  "away_team_name": "Exact name of the away team from the registered list, or 'TBD' if not decided",
  "match_date": "Date of the match in YYYY-MM-DD format (if only days of week like Saturday are given, assume the upcoming Saturday. If no dates are specified, default to today's date)",
  "kick_off_time": "Time of the match in HH:MM format (24-hour clock, default to 12:00 if not specified)",
  "stage": "The stage or round name (e.g. 'Group A', 'League', 'Quarter-finals', default to 'League' if not specified)",
  "matchday": 1
}

Notes:
- Match the team names in the input content to the closest name in the registered list. Be smart about abbreviations (e.g. "Real" -> "Real Madrid", "Man U" -> "Manchester United"). If no match is found, return the name as it appears in the text/image.
- Return ONLY a valid JSON array. Do not include markdown code block formatting (do not wrap in \`\`\`json).
`;

    let contentParts: any[] = [prompt];

    if (image) {
      // Strip data url prefix if present
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      contentParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType || 'image/png'
        }
      });
    }

    if (text) {
      contentParts.push(text);
    }

    const result = await model.generateContent(contentParts);
    const rawResponseText = result.response.text().trim();

    try {
      const parsedFixtures = JSON.parse(rawResponseText);
      if (!Array.isArray(parsedFixtures)) {
        throw new Error('AI response is not an array');
      }
      return NextResponse.json({ fixtures: parsedFixtures });
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON. Raw response:', rawResponseText);
      return NextResponse.json({ 
        error: 'Failed to parse the fixtures correctly. Please ensure the formatting is readable or try again.',
        raw: rawResponseText 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('AI Fixtures Parser error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
