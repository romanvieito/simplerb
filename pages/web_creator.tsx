import React from 'react';
import type { NextPage } from 'next';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CFAQ from '../components/CFAQ';
import CPricing from '../components/CPricing';
import { Container } from "@mui/material";

const AIWebCreatorPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>AI Website Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mb-6 mt-12 sm:mt-20">
        <Container maxWidth="lg">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-normal sm:text-7xl">
            Create Your Small Business Website <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">in Seconds</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300 sm:text-xl">
            Digital is more important than ever. World's easiest website generator.
          </p>
          <div className="mt-8 flex gap-x-4 sm:justify-center">
            <a
              href="/web"
              className="group relative px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all duration-300"
            >
              Get Started
              <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></span>
            </a>
          </div>

          <div className="mt-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
                How It Works
              </span>
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-300">Let AI Create Your Website – Get Online in No Time</p>
            
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="relative rounded-2xl border border-gray-800 p-8 bg-gradient-to-b from-gray-900 to-black hover:border-gray-700 transition-all duration-300">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-xl font-semibold">1</span>
                </div>
                <h3 className="text-xl font-semibold">Describe Your Business</h3>
                <p className="mt-4 text-gray-400">Tell us about your business and what you need</p>
              </div>
              <div className="relative rounded-2xl border border-gray-800 p-8 bg-gradient-to-b from-gray-900 to-black hover:border-gray-700 transition-all duration-300">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-xl font-semibold">2</span>
                </div>
                <h3 className="text-xl font-semibold">AI Generation</h3>
                <p className="mt-4 text-gray-400">Our AI creates a custom website just for you</p>
              </div>
              <div className="relative rounded-2xl border border-gray-800 p-8 bg-gradient-to-b from-gray-900 to-black hover:border-gray-700 transition-all duration-300">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                  <span className="text-xl font-semibold">3</span>
                </div>
                <h3 className="text-xl font-semibold">Go Live</h3>
                <p className="mt-4 text-gray-400">Preview, customize, and publish your site instantly</p>
              </div>
            </div>
          </div>

          <div className="mt-20">
            <CPricing />
            <CFAQ />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default AIWebCreatorPage;