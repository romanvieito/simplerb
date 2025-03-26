import React from "react";
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CFAQ from "../components/CFAQ";
import CPricing from "../components/CPricing";
import { Container } from "@mui/material";
import { Language } from '@mui/icons-material';

export default function AIWebCreatorPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Business Name Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black/95 z-0"></div>
        <Container maxWidth="lg" className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Language className="text-red-400 text-4xl" />
              <h1 className="text-6xl font-bold tracking-tight">
                The ideal domain, the first piece of{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
                  marketing
                </span>
              </h1>
            </div>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Find a great brand name and build your business around it. Our AI-powered generator helps you discover the perfect domain that resonates with your vision.
            </p>
            <a
              href="/domain"
              className="group relative inline-block px-8 py-4 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-all duration-300"
            >
              Get Started
              <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></span>
            </a>
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section className="py-32 bg-black">
        <Container maxWidth="lg">
          <h2 className="text-4xl font-bold text-center mb-20">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
              How It Works
            </span>
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-gray-800">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-red-500/10 rounded-full p-4">
                  <span className="text-2xl font-bold text-red-400">1</span>
                </div>
                <h3 className="text-2xl font-bold">Just One Click Away!</h3>
              </div>
              <p className="text-gray-400 text-lg">
                Build your business without lifting a finger – our AI-powered business generator does it all.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
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
      <section className="py-32 bg-black">
        <Container maxWidth="lg">
          <CFAQ />
        </Container>
      </section>
      
      <Footer />
    </div>
  );
}
