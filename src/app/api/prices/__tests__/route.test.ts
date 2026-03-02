/**
 * @jest-environment node
 */
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/prices', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/prices', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, FINNHUB_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns price data for valid tickers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ c: 150.25, d: 2.5, dp: 1.69 }),
    });

    const res = await POST(makeRequest({ tickers: ['AAPL'] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prices).toHaveProperty('AAPL');
    expect(data.prices.AAPL).toEqual({
      price: 150.25,
      change: 2.5,
      changePercent: 1.69,
    });
  });

  it('handles partial failures gracefully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ c: 150.25, d: 2.5, dp: 1.69 }),
      })
      .mockResolvedValueOnce({
        ok: false,
      });

    const res = await POST(makeRequest({ tickers: ['AAPL', 'INVALID'] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prices).toHaveProperty('AAPL');
    expect(data.prices.INVALID).toBeUndefined();
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

  it('returns empty prices for ticker with zero price', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ c: 0, d: 0, dp: 0 }),
    });

    const res = await POST(makeRequest({ tickers: ['FAKE'] }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prices.FAKE).toBeUndefined();
  });
});
