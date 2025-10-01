import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Custom500() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>500 - Server Error | SimplerB</title>
        <meta name="description" content="Something went wrong on our end." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">500</h1>
          <h2 className="text-2xl font-semibold text-gray-300 mb-6">Server Error</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Something went wrong on our end. We're working to fix this issue. Please try again later.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()} 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 mr-4"
            >
              Try Again
            </button>
            
            <Link 
              href="/" 
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go Home
            </Link>
            
            <div className="text-sm text-gray-500 mt-6">
              <p>If this problem persists, please contact our support team.</p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
