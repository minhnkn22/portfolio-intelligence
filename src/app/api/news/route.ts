import { NextRequest, NextResponse } from 'next/server';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tickers } = body;

    if (!Array.isArray(tickers)) {
      return NextResponse.json(
        { error: 'Invalid request: tickers (string[]) is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing API key' },
        { status: 500 }
      );
    }

    const news: Record<string, NewsArticle[]> = {};

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = weekAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const results = await Promise.allSettled(
      tickers.map(async (ticker: string) => {
        const symbol = ticker.toUpperCase().trim();
        if (!symbol) return;

        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&token=${apiKey}`
        );

        if (!res.ok) {
          news[symbol] = [];
          return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          news[symbol] = [];
          return;
        }

        // Take top 5 articles per ticker
        news[symbol] = data.slice(0, 5).map((article: Record<string, unknown>) => ({
          title: String(article.headline || ''),
          url: String(article.url || ''),
          source: String(article.source || ''),
          publishedAt: article.datetime
            ? new Date((article.datetime as number) * 1000).toISOString()
            : '',
        }));
      })
    );

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Failed to fetch news for ${tickers[i]}:`, r.reason);
        const symbol = tickers[i]?.toUpperCase().trim();
        if (symbol) news[symbol] = [];
      }
    });

    return NextResponse.json({ news });
  } catch (error) {
    console.error('Error fetching news:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch news';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
