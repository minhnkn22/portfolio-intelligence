'use client';

import { useState, useEffect, useCallback } from 'react';
import ImageUpload from '@/components/ImageUpload';
import MagicPanel from '@/components/MagicPanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { TickerData } from '@/components/MagicPanel';

const STORAGE_KEY = 'portfolio-analysis';

interface StoredAnalysis {
  tickers: string[];
  tickerData: TickerData[];
  imageData: string | null;
}

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerData, setTickerData] = useState<TickerData[]>([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [reanalyzeKey, setReanalyzeKey] = useState(0);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredAnalysis = JSON.parse(stored);
        if (parsed.tickers?.length && parsed.tickerData?.length) {
          setTickers(parsed.tickers);
          setTickerData(parsed.tickerData);
          setImageData(parsed.imageData);
          setRestored(true);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage when analysis completes
  const handleAnalysisComplete = useCallback(
    (data: TickerData[]) => {
      setTickerData(data);
      setRestored(true);
      try {
        const toStore: StoredAnalysis = {
          tickers,
          tickerData: data,
          imageData,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // Ignore quota errors
      }
    },
    [tickers, imageData]
  );

  const handleTickersExtracted = useCallback(
    (extracted: string[], image?: string) => {
      setTickers(extracted);
      setTickerData([]);
      setRestored(false);
      if (image) setImageData(image);
    },
    []
  );

  const handleClearResults = useCallback(() => {
    setTickers([]);
    setTickerData([]);
    setImageData(null);
    setRestored(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleReanalyze = useCallback(() => {
    if (tickers.length === 0) return;
    setTickerData([]);
    setRestored(false);
    setReanalyzeKey((k) => k + 1);
  }, [tickers]);

  const showResults = tickers.length > 0;

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Portfolio Intelligence</h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Upload a screenshot of your brokerage portfolio to get AI-powered
          sentiment analysis, news, and price data for your holdings.
        </p>
      </div>

      <ErrorBoundary>
        {!restored && (
          <ImageUpload
            onTickersExtracted={handleTickersExtracted}
          />
        )}

        {showResults && (
          <>
            <div className="flex gap-3 mt-6 mb-2">
              <button
                data-testid="clear-results-btn"
                onClick={handleClearResults}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Clear Results
              </button>
              <button
                data-testid="reanalyze-btn"
                onClick={handleReanalyze}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
              >
                Re-analyze
              </button>
            </div>

            {restored && tickerData.length > 0 ? (
              <MagicPanel
                key={`restored-${reanalyzeKey}`}
                tickers={tickers}
                initialData={tickerData}
                skipFetch={true}
              />
            ) : (
              <MagicPanel
                key={`live-${reanalyzeKey}`}
                tickers={tickers}
                onAnalysisComplete={handleAnalysisComplete}
              />
            )}
          </>
        )}
      </ErrorBoundary>
    </main>
  );
}
