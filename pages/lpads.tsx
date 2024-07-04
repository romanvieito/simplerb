import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CFAQ from '../components/CFAQ';
import CPricing from '../components/CPricing';

export default function LqPage() {

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <div>
          <h2 className="mt-12 font-medium" style={{ fontSize: 30 }}>
            Ads
          </h2>
          <CPricing/>
          <CFAQ/>
        </div> 
      </main>
      <Footer />
    </div>
  );
};