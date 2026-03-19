import { NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: Request) {
  try {
    const { clientName, timelines } = await request.json();

    if (!timelines || timelines.length === 0) {
      return NextResponse.json({ error: 'No timeline data provided' }, { status: 400 });
    }

    const openai = getOpenAI();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a longevity and health performance analyst for Peak360, a premium health assessment platform. You provide insightful, actionable summaries of a client's health trajectory based on their assessment data over time.

Your response must be valid JSON with this exact structure:
{
  "overallScore": <number 1-100>,
  "trajectory": "improving" | "stable" | "declining" | "mixed",
  "summary": "<2-3 sentence overview of overall health status and trajectory>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "concerns": ["<concern 1>", "<concern 2>", ...],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", ...],
  "categoryInsights": {
    "<category name>": "<1-2 sentence insight for this category>"
  }
}

Guidelines:
- Be specific about numbers and trends (e.g., "VO2max improved 28% from 36 to 46")
- Score reflects current state + trajectory (someone improving from poor gets credit for the trend)
- Strengths and concerns should reference specific metrics
- Recommendations should be concrete and actionable (not generic advice)
- Category insights should cover each category that has data
- Use a professional but encouraging tone appropriate for a health coach audience
- Tier ratings: elite (best), great, normal, cautious, poor (worst)`
        },
        {
          role: 'user',
          content: `Analyze the health trajectory for client "${clientName}" based on their assessment data over time.

Assessment timeline (oldest to newest):
${JSON.stringify(timelines, null, 2)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const assessment = JSON.parse(content);
    return NextResponse.json({ data: assessment });
  } catch (error) {
    console.error('AI client assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI assessment' },
      { status: 500 }
    );
  }
}
