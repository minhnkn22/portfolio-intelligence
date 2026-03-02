import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MagicPanelStatic, type TickerData } from '../MagicPanel';

const mockData: TickerData[] = [
  {
    symbol: 'AAPL',
    price: 182.52,
    change: 3.21,
    changePercent: 1.79,
    sentiment: 'bullish',
    confidence: 85,
    summary: 'Strong earnings and product pipeline',
    news: [
      { title: 'Apple beats earnings', url: 'https://example.com/1', source: 'Reuters', publishedAt: '2024-01-01' },
      { title: 'New iPhone launch', url: 'https://example.com/2', source: 'Bloomberg', publishedAt: '2024-01-02' },
      { title: 'Apple AI push', url: 'https://example.com/3', source: 'CNBC', publishedAt: '2024-01-03' },
      { title: 'Should not render', url: 'https://example.com/4', source: 'WSJ', publishedAt: '2024-01-04' },
    ],
  },
  {
    symbol: 'TSLA',
    price: 220.11,
    change: -5.43,
    changePercent: -2.41,
    sentiment: 'bearish',
    confidence: 72,
    summary: 'Delivery concerns weigh on stock',
    news: [
      { title: 'Tesla deliveries miss', url: 'https://example.com/5', source: 'Reuters', publishedAt: '2024-01-01' },
    ],
  },
  {
    symbol: 'MSFT',
    price: 410.0,
    change: 0,
    changePercent: 0,
    sentiment: 'neutral',
    confidence: 50,
    summary: 'Mixed signals from cloud segment',
    news: [],
  },
];

describe('MagicPanelStatic', () => {
  it('renders a card for each ticker', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    const cards = screen.getAllByTestId('ticker-card');
    expect(cards).toHaveLength(3);
  });

  it('displays ticker symbols, prices, and changes', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$182.52')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    expect(screen.getByText('$220.11')).toBeInTheDocument();
  });

  it('shows sentiment badges with correct text', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    const badges = screen.getAllByTestId('sentiment-badge');
    expect(badges[0]).toHaveTextContent('bullish');
    expect(badges[1]).toHaveTextContent('bearish');
    expect(badges[2]).toHaveTextContent('neutral');
  });

  it('shows green for positive change, red for negative', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    const changes = screen.getAllByTestId('ticker-change');
    // AAPL positive
    expect(changes[0].className).toContain('text-green-400');
    // TSLA negative
    expect(changes[1].className).toContain('text-red-400');
  });

  it('shows up to 3 news links per card', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    const links = screen.getAllByTestId('news-link');
    // AAPL has 4 articles but should only show 3, TSLA has 1, MSFT has 0
    expect(links).toHaveLength(4);
    expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
  });

  it('shows summaries', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    expect(screen.getByText('Strong earnings and product pipeline')).toBeInTheDocument();
    expect(screen.getByText('Delivery concerns weigh on stock')).toBeInTheDocument();
  });

  it('shows confidence bars', () => {
    render(<MagicPanelStatic tickerData={mockData} />);
    const bars = screen.getAllByTestId('confidence-bar');
    expect(bars).toHaveLength(3);
  });

  it('renders pipeline progress indicator', () => {
    render(<MagicPanelStatic tickerData={mockData} currentStep="done" />);
    expect(screen.getByTestId('pipeline-progress')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-upload')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-extract')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-analyze')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-done')).toBeInTheDocument();
  });

  it('highlights current pipeline step', () => {
    render(<MagicPanelStatic tickerData={mockData} currentStep="analyze" />);
    const analyzeStep = screen.getByTestId('pipeline-step-analyze');
    expect(analyzeStep.className).toContain('bg-blue-600');
    // Previous steps should be green (done)
    const uploadStep = screen.getByTestId('pipeline-step-upload');
    expect(uploadStep.className).toContain('bg-green-600');
    const extractStep = screen.getByTestId('pipeline-step-extract');
    expect(extractStep.className).toContain('bg-green-600');
    // Done step should be gray (not yet)
    const doneStep = screen.getByTestId('pipeline-step-done');
    expect(doneStep.className).toContain('bg-gray-700');
  });
});
