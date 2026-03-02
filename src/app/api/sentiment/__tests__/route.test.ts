/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

const mockCreate = jest.fn();

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/sentiment', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/sentiment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns sentiment for tickers with news', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            AAPL: { rating: 'bullish', confidence: 85, summary: 'Strong product launch momentum' },
            TSLA: { rating: 'bearish', confidence: 60, summary: 'Production concerns weigh on outlook' },
          }),
        },
      }],
    });

    const res = await POST(makeRequest({
      news: {
        AAPL: [{ title: 'Apple launches new iPhone', source: 'Reuters' }],
        TSLA: [{ title: 'Tesla recalls vehicles', source: 'Bloomberg' }],
      },
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sentiment.AAPL).toEqual({
      rating: 'bullish',
      confidence: 85,
      summary: 'Strong product launch momentum',
    });
    expect(data.sentiment.TSLA).toEqual({
      rating: 'bearish',
      confidence: 60,
      summary: 'Production concerns weigh on outlook',
    });
  });

  it('returns neutral with confidence 0 for tickers with no news', async () => {
    const res = await POST(makeRequest({
      news: {
        AAPL: [],
        MSFT: [],
      },
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sentiment.AAPL).toEqual({
      rating: 'neutral',
      confidence: 0,
      summary: 'No news available for analysis',
    });
    expect(data.sentiment.MSFT).toEqual({
      rating: 'neutral',
      confidence: 0,
      summary: 'No news available for analysis',
    });
    // OpenAI should NOT be called when all tickers have no news
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles mix of tickers with and without news', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            AAPL: { rating: 'bullish', confidence: 70, summary: 'Positive outlook' },
          }),
        },
      }],
    });

    const res = await POST(makeRequest({
      news: {
        AAPL: [{ title: 'Good news', source: 'CNN' }],
        MSFT: [],
      },
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sentiment.AAPL.rating).toBe('bullish');
    expect(data.sentiment.MSFT).toEqual({
      rating: 'neutral',
      confidence: 0,
      summary: 'No news available for analysis',
    });
  });

  it('returns 400 for invalid input', async () => {
    const res = await POST(makeRequest({ notNews: 'bad' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const res = await POST(makeRequest({
      news: { AAPL: [{ title: 'test', source: 'test' }] },
    }));
    expect(res.status).toBe(500);
  });

  it('clamps confidence to 0-100 range', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            AAPL: { rating: 'bullish', confidence: 150, summary: 'Very bullish' },
          }),
        },
      }],
    });

    const res = await POST(makeRequest({
      news: { AAPL: [{ title: 'test', source: 'test' }] },
    }));
    const data = await res.json();

    expect(data.sentiment.AAPL.confidence).toBe(100);
  });

  it('handles OpenAI returning invalid rating gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            AAPL: { rating: 'invalid', confidence: 50, summary: 'test' },
          }),
        },
      }],
    });

    const res = await POST(makeRequest({
      news: { AAPL: [{ title: 'test', source: 'test' }] },
    }));
    const data = await res.json();

    expect(data.sentiment.AAPL).toEqual({
      rating: 'neutral',
      confidence: 0,
      summary: 'Unable to determine sentiment',
    });
  });

  it('batches all tickers into one OpenAI call', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            AAPL: { rating: 'bullish', confidence: 80, summary: 'Good' },
            TSLA: { rating: 'neutral', confidence: 50, summary: 'Mixed' },
            GOOGL: { rating: 'bearish', confidence: 40, summary: 'Weak' },
          }),
        },
      }],
    });

    const res = await POST(makeRequest({
      news: {
        AAPL: [{ title: 'a', source: 's' }],
        TSLA: [{ title: 'b', source: 's' }],
        GOOGL: [{ title: 'c', source: 's' }],
      },
    }));
    await res.json();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
