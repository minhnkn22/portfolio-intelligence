'use client';

import { useState, useEffect, useCallback } from 'react';

export type PipelineStep = 'upload' | 'extract' | 'analyze' | 'done';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
  news: NewsArticle[];
}

interface MagicPanelProps {
  tickers: string[];
  onPipelineStep?: (step: PipelineStep) => void;
  onAnalysisComplete?: (data: TickerData[]) => void;
  initialData?: TickerData[];
  skipFetch?: boolean;
}

const STEP_LABELS: { key: PipelineStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'extract', label: 'Extract' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'done', label: 'Done' },
];

const STEP_ORDER: PipelineStep[] = ['upload', 'extract', 'analyze', 'done'];

function stepIndex(step: PipelineStep) {
  return STEP_ORDER.indexOf(step);
}

function SentimentBadge({ sentiment }: { sentiment: TickerData['sentiment'] }) {
  const colors = {
    bullish: 'bg-green-600 text-green-100',
    bearish: 'bg-red-600 text-red-100',
    neutral: 'bg-gray-600 text-gray-100',
  };
  return (
    <span
      data-testid="sentiment-badge"
      className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${colors[sentiment]}`}
    >
      {sentiment}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1" data-testid="confidence-bar">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
      />
    </div>
  );
}

function PipelineProgress({ currentStep }: { currentStep: PipelineStep }) {
  const current = stepIndex(currentStep);
  return (
    <div className="flex items-center justify-center gap-2 mb-8" data-testid="pipeline-progress">
      {STEP_LABELS.map(({ key, label }, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={key} className="flex items-center gap-2">
            <div
              data-testid={`pipeline-step-${key}`}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                done
                  ? 'bg-green-600 text-white'
                  : active
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <span className={`text-sm ${done ? 'text-green-500' : 'text-gray-600'}`}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TickerCard({ data }: { data: TickerData }) {
  const changeColor = data.change >= 0 ? 'text-green-400' : 'text-red-400';
  return (
    <div
      data-testid="ticker-card"
      className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white" data-testid="ticker-symbol">{data.symbol}</h3>
        <SentimentBadge sentiment={data.sentiment} />
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-white" data-testid="ticker-price">
          ${data.price.toFixed(2)}
        </span>
        <span className={`text-sm font-medium ${changeColor}`} data-testid="ticker-change">
          {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%)
        </span>
      </div>

      <div>
        <div className="text-xs text-gray-400 mb-1">Confidence: {data.confidence}%</div>
        <ConfidenceBar confidence={data.confidence} />
      </div>

      <p className="text-sm text-gray-300" data-testid="ticker-summary">{data.summary}</p>

      {data.news.length > 0 && (
        <div className="mt-1">
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">News</h4>
          <ul className="space-y-1">
            {data.news.slice(0, 3).map((article, i) => (
              <li key={i}>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 hover:underline line-clamp-1"
                  data-testid="news-link"
                >
                  {article.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function MagicPanel({
  tickers,
  onPipelineStep,
  onAnalysisComplete,
  initialData,
  skipFetch,
}: MagicPanelProps) {
  const [tickerData, setTickerData] = useState<TickerData[]>(initialData || []);
  const [currentStep, setCurrentStep] = useState<PipelineStep>(
    initialData?.length ? 'done' : 'extract'
  );
  const [error, setError] = useState<string | null>(null);

  const updateStep = useCallback(
    (step: PipelineStep) => {
      setCurrentStep(step);
      onPipelineStep?.(step);
    },
    [onPipelineStep]
  );

  useEffect(() => {
    if (tickers.length === 0 || skipFetch) return;

    let cancelled = false;

    async function fetchAll() {
      try {
        updateStep('extract');

        const [pricesRes, newsRes] = await Promise.all([
          fetch('/api/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers }),
          }),
          fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tickers }),
          }),
        ]);

        if (cancelled) return;

        const pricesData = await pricesRes.json();
        const newsData = await newsRes.json();

        if (!pricesRes.ok || !newsRes.ok) {
          throw new Error('Failed to fetch prices or news');
        }

        updateStep('analyze');

        const sentimentRes = await fetch('/api/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ news: newsData.news }),
        });

        if (cancelled) return;

        const sentimentData = await sentimentRes.json();

        if (!sentimentRes.ok) {
          throw new Error('Failed to analyze sentiment');
        }

        const combined: TickerData[] = tickers.map((t) => {
          const symbol = t.toUpperCase().trim();
          const price = pricesData.prices?.[symbol] || { price: 0, change: 0, changePercent: 0 };
          const sentiment = sentimentData.sentiment?.[symbol] || {
            rating: 'neutral',
            confidence: 0,
            summary: 'No data',
          };
          const news = newsData.news?.[symbol] || [];

          return {
            symbol,
            price: price.price,
            change: price.change,
            changePercent: price.changePercent,
            sentiment: sentiment.rating,
            confidence: sentiment.confidence,
            summary: sentiment.summary,
            news,
          };
        });

        if (!cancelled) {
          setTickerData(combined);
          updateStep('done');
          onAnalysisComplete?.(combined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Analysis failed');
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [tickers, updateStep, skipFetch, onAnalysisComplete]);

  if (tickers.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-10" data-testid="magic-panel">
      <PipelineProgress currentStep={currentStep} />

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300 mb-6" data-testid="panel-error">
          {error}
        </div>
      )}

      {tickerData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickerData.map((data) => (
            <TickerCard key={data.symbol} data={data} />
          ))}
        </div>
      )}

      {currentStep !== 'done' && !error && (
        <div className="flex items-center justify-center gap-2 mt-6" data-testid="analyzing-spinner">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-blue-400">
            {currentStep === 'extract' ? 'Fetching prices & news…' : 'Analyzing sentiment…'}
          </span>
        </div>
      )}
    </div>
  );
}

export function MagicPanelStatic({
  tickerData,
  currentStep = 'done',
}: {
  tickerData: TickerData[];
  currentStep?: PipelineStep;
}) {
  return (
    <div className="w-full max-w-5xl mx-auto mt-10" data-testid="magic-panel">
      <PipelineProgress currentStep={currentStep} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickerData.map((data) => (
          <TickerCard key={data.symbol} data={data} />
        ))}
      </div>
    </div>
  );
}
