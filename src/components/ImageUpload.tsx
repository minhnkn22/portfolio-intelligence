'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ImageUpload() {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

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
    </div>
  );
}
