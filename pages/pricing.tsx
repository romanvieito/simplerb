import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CPricing from '../components/CPricing';

export default function PricingPage() {

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <div>         
          <CPricing/> 
        </div>        
      </main>
      <Footer />
    </div>
  );
};