/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/news', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/news', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, FINNHUB_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns news articles for valid tickers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          headline: 'Apple releases new product',
          url: 'https://example.com/apple',
          source: 'Reuters',
          datetime: 1709300000,
        },
      ],
    });

    const res = await POST(makeRequest({ tickers: ['AAPL'] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.news).toHaveProperty('AAPL');
    expect(data.news.AAPL).toHaveLength(1);
    expect(data.news.AAPL[0]).toEqual({
      title: 'Apple releases new product',
      url: 'https://example.com/apple',
      source: 'Reuters',
      publishedAt: expect.any(String),
    });
  });

  it('handles partial failures gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { headline: 'News', url: 'https://x.com', source: 'CNN', datetime: 1709300000 },
        ],
      })
      .mockRejectedValueOnce(new Error('Network error'));

    const res = await POST(makeRequest({ tickers: ['AAPL', 'BAD'] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.news).toHaveProperty('AAPL');
    expect(data.news.BAD).toEqual([]);
  });

  it('returns 400 for invalid input', async () => {
    const res = await POST(makeRequest({ tickers: 'not-array' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when API key is missing', async () => {
    delete process.env.FINNHUB_API_KEY;
    const res = await POST(makeRequest({ tickers: ['AAPL'] }));
    expect(res.status).toBe(500);
  });

  it('limits to 5 articles per ticker', async () => {
    const articles = Array.from({ length: 10 }, (_, i) => ({
      headline: `Article ${i}`,
      url: `https://example.com/${i}`,
      source: 'Test',
      datetime: 1709300000 + i,
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => articles,
    });

    const res = await POST(makeRequest({ tickers: ['AAPL'] }));
    const data = await res.json();

    expect(data.news.AAPL).toHaveLength(5);
  });
});
