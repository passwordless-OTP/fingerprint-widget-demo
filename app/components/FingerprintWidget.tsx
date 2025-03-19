'use client';

import React, { useState, useEffect } from 'react';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Define types for the component props
interface FingerprintWidgetProps {
  apiKey: string;
  router: AppRouterInstance;
  onIdentify?: (visitorId: string, confidence: number) => void;
  onError?: (error: Error) => void;
  fingerprintJS?: any; // Allow for dependency injection in tests
}

// Define the result types
interface FingerprintResult {
  visitorId: string;
  confidence: {
    score: number;
  };
}

const FingerprintWidget: React.FC<FingerprintWidgetProps> = ({
  apiKey,
  router,
  onIdentify,
  onError,
  fingerprintJS
}) => {
  // Component state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<FingerprintResult | null>(null);

  // Load and initialize the fingerprinting library
  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the injected dependency if available (for testing)
        // or load the actual library
        const fpPromise = fingerprintJS
          ? fingerprintJS.load()
          : import('@fingerprintjs/fingerprintjs-pro').then(FingerprintJS => 
              FingerprintJS.load({ apiKey })
            );

        const fp = await fpPromise;
        const result = await fp.get();

        setResult(result);
        setLoading(false);

        // Call the onIdentify callback if provided
        if (onIdentify) {
          onIdentify(result.visitorId, result.confidence.score);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Error identifying visitor:', error);
        setError(error);
        setLoading(false);

        // Call the onError callback if provided
        if (onError) {
          onError(error);
        }
      }
    };

    loadFingerprint();
  }, [apiKey, onIdentify, onError, fingerprintJS]);

  // Handle refresh button click
  const handleRefresh = () => {
    router.refresh();
  };

  // Handle retry button click
  const handleTryAgain = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    router.refresh();
  };

  // Format the confidence score as a percentage
  const formatConfidence = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="fingerprint-widget loading">
        <div className="spinner"></div>
        <p>Identifying your device...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fingerprint-widget error" data-testid="error-container">
        <div className="error-icon">❌</div>
        <p className="error-message">Error: {error.message}</p>
        <button 
          className="try-again-button" 
          onClick={handleTryAgain}
          data-testid="try-again-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Result state
  return (
    <div className="fingerprint-widget result" data-testid="result-container">
      <div className="result-header">
        <h3>Device Identification</h3>
        <button 
          className="refresh-button" 
          onClick={handleRefresh}
          data-testid="refresh-button"
        >
          Refresh
        </button>
      </div>
      <div className="result-content">
        <div className="result-item">
          <label>Visitor ID:</label>
          <span className="visitor-id" data-testid="visitor-id">{result?.visitorId}</span>
        </div>
        <div className="result-item">
          <label>Confidence:</label>
          <span className="confidence-score" data-testid="confidence-score">
            {result ? formatConfidence(result.confidence.score) : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FingerprintWidget; 