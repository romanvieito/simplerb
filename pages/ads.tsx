import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";

const AdsPage = () => {

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Ads
        </h1>        
      </main>
      <Footer/>      
    </div>
  );
};

export default AdsPage;