'use client';

import { useState } from 'react';
import FingerprintWidget from '../components/FingerprintWidget';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FingerprintDemo() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('fp_mock_key_123456789');
  const [identificationResults, setIdentificationResults] = useState<Array<{
    timestamp: number;
    visitorId: string;
    confidence: number;
  }>>([]);

  const handleIdentify = (visitorId: string, confidence: number) => {
    setIdentificationResults(prev => [
      {
        timestamp: Date.now(),
        visitorId,
        confidence
      },
      ...prev
    ]);
  };

  const handleError = (error: Error) => {
    console.error('Fingerprint identification error:', error);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fingerprint.com Integration Demo</h1>
        <p className="text-gray-600">
          This demo showcases how to integrate Fingerprint.com for device identification.
        </p>
        <div className="mt-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Configuration</h2>
            
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="text"
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                This is a mock API key for demonstration purposes.
              </p>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">About Fingerprinting</h3>
              <p className="text-sm text-gray-600 mb-2">
                Device fingerprinting helps identify unique devices without cookies by analyzing browser and device characteristics.
              </p>
              <p className="text-sm text-gray-600">
                The confidence score indicates how reliable the identification is, with higher scores meaning greater certainty.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <FingerprintWidget 
            apiKey={apiKey}
            router={router}
            onIdentify={handleIdentify}
            onError={handleError}
          />
          
          <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">How It Works</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>The widget loads the Fingerprint.com SDK</li>
              <li>The SDK collects various browser and device signals</li>
              <li>These signals are processed to generate a unique visitor ID</li>
              <li>The ID persists across sessions for the same device</li>
              <li>A confidence score indicates identification reliability</li>
            </ol>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Identification History</h2>
            
            {identificationResults.length === 0 ? (
              <p className="text-gray-500 italic">No identifications yet</p>
            ) : (
              <div className="space-y-4">
                {identificationResults.map((result, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                    <div className="font-mono text-sm mt-1 break-all">
                      {result.visitorId}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {identificationResults.length > 0 && (
              <button
                onClick={() => setIdentificationResults([])}
                className="mt-4 w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
              >
                Clear History
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Implementation Notes</h2>
        <p className="mb-4">
          This demo uses a mock implementation of the Fingerprint.com SDK. In a real application, you would:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>Sign up for a Fingerprint.com account to get a real API key</li>
          <li>Install the official SDK: <code className="bg-blue-100 px-1 py-0.5 rounded">npm install @fingerprintjs/fingerprintjs-pro</code></li>
          <li>Replace the mock implementation with the real SDK</li>
          <li>Implement server-side verification for enhanced security</li>
          <li>Consider privacy implications and ensure compliance with regulations</li>
        </ul>
      </div>
    </div>
  );
} 