'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  onTickersExtracted?: (tickers: string[]) => void;
}

export default function ImageUpload({ onTickersExtracted }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractTickers = useCallback(async (base64Image: string) => {
    setLoading(true);
    setError(null);
    setTickers([]);
    try {
      const res = await fetch('/api/extract-tickers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract tickers');
      }
      const extracted = data.tickers || [];
      setTickers(extracted);
      onTickersExtracted?.(extracted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract tickers');
    } finally {
      setLoading(false);
    }
  }, [onTickersExtracted]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      extractTickers(result);
    };
    reader.readAsDataURL(file);
  }, [extractTickers]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        data-testid="dropzone"
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-400 hover:border-blue-400'
        }`}
      >
        <input {...getInputProps()} data-testid="file-input" />
        {isDragActive ? (
          <p className="text-blue-500 text-lg">Drop your portfolio screenshot here…</p>
        ) : (
          <div>
            <p className="text-lg font-medium">Drag & drop your portfolio screenshot</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse (PNG, JPEG)</p>
          </div>
        )}
      </div>

      {preview && (
        <div className="mt-6 flex justify-center">
          <img
            src={preview}
            alt="Portfolio preview"
            data-testid="preview-image"
            className="max-h-64 rounded-lg shadow-lg"
          />
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2" data-testid="loading-spinner">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-blue-500">Extracting tickers…</span>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" data-testid="error-message">
          {error}
        </div>
      )}

      {tickers.length > 0 && !loading && (
        <div className="mt-6" data-testid="tickers-list">
          <h3 className="text-lg font-semibold mb-2">Extracted Tickers</h3>
          <div className="flex flex-wrap gap-2">
            {tickers.map((ticker) => (
              <span
                key={ticker}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
