import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Box, Button, Tooltip, Container, Grid } from "@mui/material";
import { useClerk, SignedOut } from "@clerk/nextjs";
import type { NextPage } from "next";

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CPricing from '../components/CPricing';
import CFAQ from '../components/CFAQ';

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
      
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-r from-black to-blue-900 text-white py-20">
        <Container maxWidth="lg">
          <h1 className="sm:text-6xl text-5xl max-w-[708px] font-bold mb-6">
            Launch Your Business in Just {" "}
            <span className="text-yellow-300">3 Clicks</span>
          </h1>
          <h2 className="sm:text-2xl text-xl mb-8">
            It all starts with the right domain: Set your brand apart, build your website, and attract customers with targeted ads.
          </h2>
          <div className="flex">
            <div className="mr-2">
              <a
                href={pages[0].link}
                className="bg-blue-600 cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-blue-700 w-full"
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
        </Container>
      </section>

      {/* Features Section (Our Services) */}
      <section className="w-full bg-gray-100 py-16">
        <Container maxWidth="lg">
          <h2 className="text-3xl font-semibold mb-12 text-center">Our Services</h2>
          <Grid container spacing={4} justifyContent="center">
            {pages.map((page, index) => (
              <Grid item xs={12} sm={6} md={4} key={index} className="flex justify-center">
                <div className="w-64 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-center">{page.name}</h3>
                  <p className="text-gray-600 mb-6 text-center">
                    {page.name === 'Domain' && 'Find the right domain for your brand.'}
                    {page.name === 'Website Generator' && 'Create a faster website in seconds.'}
                    {page.name === 'Ads Generator' && 'Try quick ads to attract customers.'}
                  </p>
                  <div className="text-center">
                    <a
                      href={page.link}
                      className="inline-block bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                    >
                      Try {page.name}
                    </a>
                  </div>
                </div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </section>

      {/* Video Section */}
      <section className="w-full bg-white py-16">
        <Container maxWidth="lg">
          <h2 className="text-3xl font-semibold mb-8 text-center">See How It Works</h2>
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
          <p className="mt-4 text-gray-600 text-center">
            Watch our quick demo to see how easy it is to launch your business with our platform.
          </p>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="w-full bg-gray-50 py-16">
        <Container maxWidth="lg">
          <h2 className="text-3xl font-semibold mb-8 text-center">Choose Your Plan</h2>
          <CPricing />
        </Container>
      </section>


      {/* FAQ Section */}
      <section className="w-full bg-white py-16">
        <Container maxWidth="lg">
          {/* <h2 className="text-3xl font-semibold mb-8 text-center">Choose Your Plan</h2> */}
      <CFAQ />
        </Container>
      </section>
      <Footer />
    </div>
  );
};

export default Home;