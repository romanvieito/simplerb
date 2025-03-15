import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Box, Button, Container, Grid } from "@mui/material";
import { useClerk, SignedOut } from "@clerk/nextjs";
import type { NextPage } from "next";
import CPricing from '../components/CPricing';
import CFAQ from '../components/CFAQ';

const Home: NextPage = () => {
  const pages = [{
    name: 'Domain', 
    link: '/domain'
  }, {
    name: 'Ads Generator', 
    link: '/ads'
  }];

  const { openSignIn } = useClerk();

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black/95 z-0"></div>
        <Container maxWidth="lg" className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-8xl font-bold mb-8 tracking-tight">
              Grow digital with {" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
                ease
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Take your channel to the next level with a simple creator toolkit to own your domain, launch a site, promote with ads, and connect via email.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href={pages[0].link}
                className="group relative px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all duration-300"
              >
                Get Started
                <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></span>
              </a>
              <SignedOut>
                <button
                  onClick={() => openSignIn()}
                  className="px-8 py-4 border border-gray-700 rounded-full font-medium hover:bg-white/10 transition-all duration-300"
                >
                  Sign in
                </button>
              </SignedOut>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-black">
        <Container maxWidth="lg">
          <h2 className="text-4xl font-bold text-center mb-20">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
              Our Services
            </span>
          </h2>
          <Grid container spacing={6} justifyContent="center">
            {pages.map((page, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-gray-700 transition-all duration-300">
                  <h3 className="text-2xl font-bold mb-4">{page.name}</h3>
                  <p className="text-gray-400 mb-6">
                    {page.name === 'Domain' && 'Find the perfect domain that resonates with your brand identity and vision.'}
                    {page.name === 'Ads Generator' && 'Create compelling ad campaigns that connect with your target audience.'}
                  </p>
                  <a
                    href={page.link}
                    className="inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    Explore {page.name}
                    <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Video Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
        <Container maxWidth="lg">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Experience the Simplicity</h2>
            <p className="text-gray-400 text-center mb-12">Bridge your channel, build your fanbase, and maximize your earnings.</p>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%', height: 0 }}>
              <video 
                className="absolute top-0 left-0 w-full h-full"
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
          </div>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-black">
        <Container maxWidth="lg">
          <h2 className="text-4xl font-bold text-center mb-20">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
              Choose Your Plan
            </span>
          </h2>
          <CPricing />
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black">
        <Container maxWidth="lg">
          <CFAQ />
        </Container>
      </section>
      
      <Footer />
    </div>
  );
};

export default Home;