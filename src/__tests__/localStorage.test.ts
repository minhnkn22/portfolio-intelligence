/**
 * @jest-environment node
 */

const STORAGE_KEY = 'portfolio-analysis';

interface StoredAnalysis {
  tickers: string[];
  tickerData: Array<{
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    sentiment: string;
    confidence: number;
    summary: string;
    news: Array<{ title: string; url: string; source: string; publishedAt: string }>;
  }>;
  imageData: string | null;
}

// Simple in-memory localStorage mock for unit testing persistence logic
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('localStorage persistence', () => {
  let storage: MockLocalStorage;

  const sampleData: StoredAnalysis = {
    tickers: ['AAPL', 'MSFT'],
    tickerData: [
      {
        symbol: 'AAPL',
        price: 178.5,
        change: 2.3,
        changePercent: 1.3,
        sentiment: 'bullish',
        confidence: 85,
        summary: 'Strong earnings outlook',
        news: [{ title: 'Apple rises', url: 'https://example.com', source: 'Test', publishedAt: '2026-01-01' }],
      },
      {
        symbol: 'MSFT',
        price: 410.2,
        change: -1.1,
        changePercent: -0.27,
        sentiment: 'neutral',
        confidence: 60,
        summary: 'Mixed signals',
        news: [],
      },
    ],
    imageData: 'data:image/png;base64,abc123',
  };

  beforeEach(() => {
    storage = new MockLocalStorage();
  });

  test('saves analysis results to localStorage', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    const stored = storage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.tickers).toEqual(['AAPL', 'MSFT']);
    expect(parsed.tickerData).toHaveLength(2);
    expect(parsed.tickerData[0].symbol).toBe('AAPL');
  });

  test('restores analysis results from localStorage', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    const stored = storage.getItem(STORAGE_KEY);
    const parsed: StoredAnalysis = JSON.parse(stored!);
    expect(parsed.tickers).toEqual(sampleData.tickers);
    expect(parsed.tickerData[0].price).toBe(178.5);
    expect(parsed.tickerData[1].sentiment).toBe('neutral');
    expect(parsed.imageData).toBe('data:image/png;base64,abc123');
  });

  test('clears analysis results from localStorage', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    storage.removeItem(STORAGE_KEY);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('handles missing localStorage data gracefully', () => {
    const stored = storage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();
  });

  test('handles corrupted localStorage data gracefully', () => {
    storage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const stored = storage.getItem(STORAGE_KEY);
    let parsed: StoredAnalysis | null = null;
    try {
      parsed = JSON.parse(stored!);
    } catch {
      parsed = null;
    }
    expect(parsed).toBeNull();
  });

  test('overwrites previous data on re-save', () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(sampleData));
    const newData: StoredAnalysis = {
      tickers: ['GOOG'],
      tickerData: [{
        symbol: 'GOOG',
        price: 140.0,
        change: 0.5,
        changePercent: 0.36,
        sentiment: 'bullish',
        confidence: 90,
        summary: 'AI momentum',
        news: [],
      }],
      imageData: null,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(newData));
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(parsed.tickers).toEqual(['GOOG']);
    expect(parsed.tickerData).toHaveLength(1);
  });
});
