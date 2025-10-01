import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Custom404() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>404 - Page Not Found | SimplerB</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header />
      
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-300 mb-6">Page Not Found</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>
          
          <div className="space-y-4">
            <Link 
              href="/" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Go Home
            </Link>
            
            <div className="text-sm text-gray-500">
              <Link href="/web" className="hover:text-blue-400 transition-colors duration-200 mr-4">
                Web Creator
              </Link>
              <Link href="/domain" className="hover:text-blue-400 transition-colors duration-200 mr-4">
                Domain Generator
              </Link>
              <Link href="/email" className="hover:text-blue-400 transition-colors duration-200">
                Email Creator
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
