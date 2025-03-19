'use client';

import React from 'react';
import OTPLoginWidget from './components/OTPLoginWidget';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <OTPLoginWidget />
      
      <div className="mt-8">
        <Link 
          href="/fingerprint-demo"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Fingerprint Demo
        </Link>
      </div>
    </main>
  );
} 