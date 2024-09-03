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
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <h1 className="sm:text-8xl text-6xl max-w-[708px] font-bold text-slate-900">
          Launch Your Business in Just {" "}
          <span className="text-blue-600">3 Clicks</span>
        </h1>

        <h2 className="mt-9 sm:text-3xl text-xl" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
          It all starts with the right domain: Set your brand apart, build your website, and attract customers with targeted ads.
        </h2>

        {/* <Button size="small" key={pages[0].name} href={pages[0].link}>
          Create Domain
        </Button> */}

        {/* <div className="max-w-xl w-full">
          <div className="flex mt-10 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Let's Start Generating Your Business Domain{" "}
              <Tooltip
                title={
                  <div>
                    <p>
                      Type the main focus of your business or hobby. This helps
                      us suggest a domain that's just right for you
                    </p>
                  </div>
                }
              >
                <span className="info-icon cursor-pointer">&#x24D8;</span>
              </Tooltip>
            </p>
          </div>
          <textarea
            value=""
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={
              "Enter Your Business or Hobby. E.g., Boutique Coffee Shop, Personal Fitness"
            }
          />
        </div> */}
        <div className="flex mt-20">
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
      </main>
      <Footer />
    </div>
  );
};

export default Home;