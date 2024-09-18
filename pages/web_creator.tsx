import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CFAQ from '../components/CFAQ';
import CPricing from '../components/CPricing';

export default function AIWebCreatorPage() {
  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>AI Website Creator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mb-6 mt-12 sm:mt-20">
        <h1 className="text-4xl font-bold mb-8">Create Your Website with AI</h1>
        <p className="text-xl mb-8">Launch your website in seconds. World's easiest website creator.</p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          <a href="/web" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Get Started <span className="inline-block ml-2">➔</span>
          </a>
        </button>
        
        <div className="mt-16">
          <h2 className="text-3xl font-semibold mb-8">How It Works</h2>
          <p className="text-xl mb-4">The Easiest Website Creator in the World</p>
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 rounded-full p-4 mr-4">
              <span className="text-2xl font-bold">1</span>
            </div>
            <p className="text-lg">Just One Click and Your Website is Ready!</p>
          </div>
          <p className="mt-4 text-gray-600">No coding, no design skills needed. Our AI does all the work for you.</p>
        </div>
        
        <div className="mt-16">
          <CPricing />
          <CFAQ />
        </div>
      </main>
      <Footer />
    </div>
  );
};