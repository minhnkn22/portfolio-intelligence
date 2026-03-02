import { NextRequest, NextResponse } from 'next/server';


interface NewsArticle {
  title: string;
  source: string;
}

interface SentimentResult {
  rating: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { news } = body as { news: Record<string, NewsArticle[]> };

    if (!news || typeof news !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: news (Record<string, Array<{title, source}>>) is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const sentiment: Record<string, SentimentResult> = {};

    if (!apiKey) {
      // Keyword-based fallback sentiment analysis
      const positiveWords = ['growth', 'record', 'exceed', 'strong', 'expand', 'boost', 'rise', 'ramp', 'launch', 'new', 'premium', 'benefit', 'demand', 'green'];
      const negativeWords = ['decline', 'fall', 'drop', 'loss', 'weak', 'concern', 'risk', 'debate', 'mixed', 'slow', 'cut', 'layoff'];
      
      for (const [ticker, articles] of Object.entries(news)) {
        if (!articles || articles.length === 0) {
          sentiment[ticker] = { rating: 'neutral', confidence: 30, summary: 'No news available for analysis' };
          continue;
        }
        const allText = articles.map(a => a.title.toLowerCase()).join(' ');
        let score = 0;
        positiveWords.forEach(w => { if (allText.includes(w)) score++; });
        negativeWords.forEach(w => { if (allText.includes(w)) score--; });
        
        if (score > 1) {
          sentiment[ticker] = { rating: 'bullish', confidence: Math.min(85, 50 + score * 10), summary: 'Positive news momentum suggests upward trend' };
        } else if (score < -1) {
          sentiment[ticker] = { rating: 'bearish', confidence: Math.min(85, 50 + Math.abs(score) * 10), summary: 'Negative headlines indicate cautious outlook' };
        } else {
          sentiment[ticker] = { rating: 'neutral', confidence: 45, summary: 'Mixed signals — monitor for clearer direction' };
        }
      }
      return NextResponse.json({ sentiment });
    }
    const tickersWithNews: string[] = [];

    for (const [ticker, articles] of Object.entries(news)) {
      if (!articles || articles.length === 0) {
        sentiment[ticker] = { rating: 'neutral', confidence: 0, summary: 'No news available for analysis' };
      } else {
        tickersWithNews.push(ticker);
      }
    }

    if (tickersWithNews.length > 0) {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey });

      const tickerSections = tickersWithNews.map((ticker) => {
        const headlines = news[ticker]
          .map((a) => `- "${a.title}" (${a.source})`)
          .join('\n');
        return `${ticker}:\n${headlines}`;
      }).join('\n\n');

      const prompt = `Analyze the sentiment for each stock ticker based on their recent news headlines. For each ticker, provide:
- rating: "bullish", "bearish", or "neutral"
- confidence: a number from 0 to 100
- summary: a one-line summary of the sentiment

Respond ONLY with valid JSON in this exact format:
{
  "TICKER": { "rating": "bullish"|"bearish"|"neutral", "confidence": <number>, "summary": "<string>" }
}

Here are the tickers and their headlines:

${tickerSections}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial sentiment analyst. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content?.trim() || '{}';
      const jsonStr = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(jsonStr) as Record<string, SentimentResult>;

      for (const ticker of tickersWithNews) {
        const result = parsed[ticker];
        if (result && ['bullish', 'bearish', 'neutral'].includes(result.rating)) {
          sentiment[ticker] = {
            rating: result.rating,
            confidence: Math.max(0, Math.min(100, Number(result.confidence) || 0)),
            summary: String(result.summary || ''),
          };
        } else {
          sentiment[ticker] = { rating: 'neutral', confidence: 0, summary: 'Unable to determine sentiment' };
        }
      }
    }

    return NextResponse.json({ sentiment });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    const message = error instanceof Error ? error.message : 'Failed to analyze sentiment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
