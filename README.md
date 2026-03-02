# Portfolio Intelligence

AI-powered portfolio analysis tool. Upload a screenshot of your brokerage portfolio to get sentiment analysis, live prices, and curated news for every holding.

## Features

- **Image Upload** — Drag & drop a portfolio screenshot
- **OCR Ticker Extraction** — Automatically detects stock tickers via OpenAI Vision
- **Live Prices** — Fetches real-time prices from Finnhub
- **News Aggregation** — Pulls recent news per ticker from Finnhub
- **AI Sentiment Analysis** — OpenAI-powered bullish/bearish/neutral ratings
- **localStorage Persistence** — Results survive page refreshes
- **Error Boundaries** — Graceful error handling throughout

## Getting Started

```bash
npm install
cp .env.example .env.local  # Fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key for OCR and sentiment analysis |
| `FINNHUB_API_KEY` | Yes | Finnhub API key for prices and news |

Create a `.env.local` file with these values. See `.env.example` for the template.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- OpenAI SDK v6
- Jest + Testing Library

## Deployment

Deploy to Vercel — no special configuration needed. Set environment variables in the Vercel dashboard.

## License

MIT
