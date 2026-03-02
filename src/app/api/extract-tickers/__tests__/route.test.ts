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
        create: jest.fn(),
      },
    },
  }));
});

import OpenAI from 'openai';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/extract-tickers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/extract-tickers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('returns 400 if no image provided', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('returns 400 if image is not a string', async () => {
    const res = await POST(makeRequest({ image: 123 }));
    expect(res.status).toBe(400);
  });

  it('extracts and validates tickers from OpenAI response', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '["AAPL", "MSFT", "GOOGL"]' } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ image: 'data:image/png;base64,abc123' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tickers).toEqual(['AAPL', 'MSFT', 'GOOGL']);
  });

  it('filters out invalid tickers', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '["AAPL", "invalid123", "TOOLONGTICKER", "X", "AB"]' } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ image: 'base64data' }));
    const data = await res.json();
    // Only AAPL, X, AB should pass (uppercase, 1-5 chars)
    expect(data.tickers).toEqual(['AAPL', 'X', 'AB']);
  });

  it('handles markdown-wrapped JSON response', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: '```json\n["TSLA", "NVDA"]\n```' } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ image: 'base64data' }));
    const data = await res.json();
    expect(data.tickers).toEqual(['TSLA', 'NVDA']);
  });

  it('returns empty array if no JSON found in response', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'No tickers found in this image.' } }],
    });
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ image: 'base64data' }));
    const data = await res.json();
    expect(data.tickers).toEqual([]);
  });

  it('returns 500 on OpenAI API error', async () => {
    const mockCreate = jest.fn().mockRejectedValue(new Error('API rate limit'));
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ image: 'base64data' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('API rate limit');
  });
});
