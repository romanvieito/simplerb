import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";

const AdsPage = () => {

  const { openSignIn } = useClerk();

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h2 className="mt-12 font-medium" style={{ fontSize: 30 }}>
          Join the Exclusive Waitlist for our Google Ads Generator
        </h2>        
        <h4 className="mt-3">
          Discovery the future of Google Ads. Get early access and special perks
        </h4> 
        <SignedOut>  
          <button
            className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80"
            onClick={() => openSignIn()}
          >
            Sign Up Now for Early Access
          </button> 
        </SignedOut>
        <SignedIn>        
          <button
            className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80"
          >
            Join the Waitlist for Early Access and Exclusive Benefits
          </button> 
        </SignedIn>                   
      </main>
      <Footer/>      
    </div>
  );
};

export default AdsPage;