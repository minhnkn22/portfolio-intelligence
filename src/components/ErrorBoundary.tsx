'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          data-testid="error-boundary"
          className="p-6 bg-red-900/30 border border-red-700 rounded-xl text-center"
        >
          <h2 className="text-lg font-semibold text-red-300 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
