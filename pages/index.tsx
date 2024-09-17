import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Box, Button, Tooltip } from "@mui/material";
import { useClerk, SignedOut } from "@clerk/nextjs";
import type { NextPage } from "next";

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CPricing from '../components/CPricing';

const Home: NextPage = () => {

  const pages = [{
    name: 'Domain', 
    link: '/domain'
  }, {
    name: 'Website Generator', 
    link: '/web'
  }, {
    name: 'Ads Generator', 
    link: '/ads'
  }];

  const { openSignIn } = useClerk();

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-5xl max-w-[708px] font-bold text-slate-900">
          Launch Your Business in Just {" "}
          <span className="text-blue-600">3 Clicks</span>
        </h1>

        <h2 className="mt-9 sm:text-2xl text-xl" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
          It all starts with the right domain: Set your brand apart, build your website, and attract customers with targeted ads.
        </h2>

        <div className="flex mt-10">
          <div className="mr-2">
            <a
              href={pages[0].link}
              className="bg-blue-600 cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-gray/80 w-full"
            >
              Get Started
            </a>
          </div>
          <SignedOut>
            <div className="">
              <a
                onClick={() => openSignIn()}
                className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              >
                Sign in / up
              </a>
            </div>
          </SignedOut>
        </div>

        <div className="flex flex-wrap justify-center mt-16 gap-8">
          {pages.map((page, index) => (
            <div key={index} className="w-64 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-xl font-semibold mb-4">{page.name}</h3>
              <p className="text-gray-600 mb-6">
                {page.name === 'Domain' && 'Find the right domain for your brand.'}
                {page.name === 'Website Generator' && 'Create a faster website in seconds.'}
                {page.name === 'Ads Generator' && 'Try quick ads to attract customers.'}
              </p>
              <a
                href={page.link}
                className="bg-black text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300"
              >
                Try {page.name}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 w-full max-w-3xl">
          <h2 className="text-3xl font-semibold mb-8">See How It Works</h2>
          <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
            <video 
              className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
              controls
              autoPlay
              muted
              loop
              poster="/video-thumbnail.jpg"
            >
              <source src="/simplerB.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="mt-4 text-gray-600">
            Watch our quick demo to see how easy it is to launch your business with our platform.
          </p>
        </div>
        
        <div className="mt-16">
          <CPricing />
        </div>
        
      </main>
      <Footer />
    </div>
  );
};

export default Home;