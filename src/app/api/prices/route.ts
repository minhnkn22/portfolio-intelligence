import { NextRequest, NextResponse } from 'next/server';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
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

    const prices: Record<string, PriceData> = {};

    const results = await Promise.allSettled(
      tickers.map(async (ticker: string) => {
        const symbol = ticker.toUpperCase().trim();
        if (!symbol) return;

        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
        );

        if (!res.ok) return;

        const data = await res.json();

        // Finnhub returns c=current, d=change, dp=changePercent
        if (data.c && data.c > 0) {
          prices[symbol] = {
            price: data.c,
            change: data.d ?? 0,
            changePercent: data.dp ?? 0,
          };
        }
      })
    );

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Failed to fetch price for ${tickers[i]}:`, r.reason);
      }
    });

    return NextResponse.json({ prices });
  } catch (error) {
    console.error('Error fetching prices:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch prices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
