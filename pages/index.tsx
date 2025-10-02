import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Box, Button, Container, Grid } from "@mui/material";
import { useClerk, SignedOut } from "@clerk/nextjs";
import type { NextPage } from "next";
import CPricing from '../components/CPricing';
import CFAQ from '../components/CFAQ';
import { Language, Web, Email, Campaign, Login } from '@mui/icons-material';
import { trackConversion } from '../utils/analytics';

const Home: NextPage = () => {
  const pages = [{
    name: 'Domain',
    link: '/domain',
    icon: Language
  }, {
    name: 'Website Builder',
    link: '/web',
    icon: Web
  }, {
    name: 'Email Marketing',
    link: '/email',
    icon: Email
  }, {
    name: 'Ads Generator',
    link: '/ads',
    icon: Campaign
  },];

  const { openSignIn } = useClerk();

  const handleGetStarted = (e: React.MouseEvent<HTMLAnchorElement>) => {
    trackConversion('get_started', pages[0].link);
  };

  const handleSignIn = () => {
    trackConversion('sign_in');
    openSignIn();
  };

  const handleFeatureClick = (e: React.MouseEvent<HTMLAnchorElement>, featureName: string, url: string) => {
    trackConversion('feature_click', url);
  };

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
            <h1 className="text-7xl md:text-8xl font-bold mb-8 tracking-tight">
              Grow digital with {" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                ease
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Take your business to the next level with a simple creator toolkit to find your domain, launch a site, promote with ads, and connect via email.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={pages[0].link}
                className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                onClick={handleGetStarted}
              >
                Get Started
                <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"></span>
              </a>
              <SignedOut>
                <button
                  onClick={handleSignIn}
                  className="group relative px-8 py-4 border-2 border-gray-700 rounded-full font-semibold hover:bg-white/10 hover:border-white transition-all duration-300 text-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/20"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Login sx={{ fontSize: '1.25rem' }} />
                    Sign in
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Everything You Need to Grow Your Business
            </span>
          </h2>
          <Grid container spacing={6} justifyContent="center">
            {pages.map((page, index) => (
              <Grid item xs={12} sm={6} key={page.name}>
                <a
                  href={page.link}
                  className="block group"
                  onClick={(e) => handleFeatureClick(e, page.name, page.link)}
                >
                  <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-gray-800 group-hover:border-gray-700 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      {React.createElement(page.icon, { className: "text-blue-400 text-3xl" })}
                      <h3 className="text-2xl font-bold">{page.name}</h3>
                    </div>
                    <p className="text-gray-400 mb-6">
                      {page.name === 'Domain' && 'Find a domain that matches your channel\'s vibe and vision.'}
                      {page.name === 'Website Builder' && 'Create a simple website to engage with your audience.'}
                      {page.name === 'Email Marketing' && 'Boost your subscriber base with emails that inspire action.'}
                      {page.name === 'Ads Generator' && 'Craft ads that drive views and revenue for your channel.'}
                    </p>
                    <span
                      className="inline-flex items-center text-sm font-medium text-blue-400 group-hover:text-blue-300"
                    >
                      Explore {page.name}
                      <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </a>
              </Grid>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Video Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
        <Container maxWidth="lg">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Keep it Simpler</h2>
            <p className="text-gray-400 text-center mb-12">Bridge your business, build your fanbase, and maximize your earnings.</p>
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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
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