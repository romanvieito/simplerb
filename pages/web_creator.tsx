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
        <title>AI Website Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mb-6 mt-12 sm:mt-20">
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-normal text-gray-900 sm:text-7xl">
          Create Your Small Business Website <span className="text-red-600">in Seconds</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 sm:text-xl">
          Digital is more important than ever. World's easiest website generator powered by AI.
        </p>
        <div className="mt-8 flex gap-x-4 sm:justify-center">
          <a
            href="/web"
            className="inline-block rounded-lg bg-red-600 px-8 py-3 text-base font-semibold leading-7 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-all duration-200"
          >
            Get Started <span className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1">➔</span>
          </a>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">How It Works</h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">Let AI Create Your Website – Get Online in No Time</p>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="relative rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                <span className="text-xl font-semibold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Describe Your Business</h3>
              <p className="mt-4 text-gray-600">Tell us about your business and what you need</p>
            </div>
            <div className="relative rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                <span className="text-xl font-semibold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">AI Generation</h3>
              <p className="mt-4 text-gray-600">Our AI creates a custom website just for you</p>
            </div>
            <div className="relative rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                <span className="text-xl font-semibold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Go Live</h3>
              <p className="mt-4 text-gray-600">Preview, customize, and publish your site instantly</p>
            </div>
          </div>
        </div>

        <div className="mt-20">
          <CPricing />
          <CFAQ />
        </div>
      </main>
      <Footer />
    </div>
  );
};