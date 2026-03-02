import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const TICKER_REGEX = /^[A-Z]{1,5}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: image (base64 string) is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const dataUrl = image.startsWith('data:')
      ? image
      : `data:image/png;base64,${image}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all stock ticker symbols from this brokerage portfolio screenshot. Return ONLY a JSON array of uppercase ticker strings, e.g. ["AAPL","MSFT"]. If no tickers found, return [].',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '[]';

    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return NextResponse.json({ tickers: [] });
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ tickers: [] });
    }

    const tickers = parsed
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toUpperCase().trim())
      .filter((t) => TICKER_REGEX.test(t));

    return NextResponse.json({ tickers });
  } catch (error) {
    console.error('Error extracting tickers:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to extract tickers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
