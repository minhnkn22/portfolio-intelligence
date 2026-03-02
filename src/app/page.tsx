import ImageUpload from '@/components/ImageUpload';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Portfolio Intelligence</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
          Upload a screenshot of your brokerage portfolio to get AI-powered
          sentiment analysis, news, and price data for your holdings.
        </p>
      </div>
      <ImageUpload />
    </main>
  );
}
