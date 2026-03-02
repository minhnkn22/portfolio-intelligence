'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import MagicPanel from '@/components/MagicPanel';

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Portfolio Intelligence</h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Upload a screenshot of your brokerage portfolio to get AI-powered
          sentiment analysis, news, and price data for your holdings.
        </p>
      </div>
      <ImageUpload onTickersExtracted={setTickers} />
      <MagicPanel tickers={tickers} />
    </main>
  );
}
