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
              Business name generator to find the best domain for your business.
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
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl mx-auto">
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
              <h3 className="text-xl font-semibold">AI Domain Search</h3>
              <p className="mt-4 text-gray-400">Our AI finds the perfect domain for your business</p>
            </div>
            <div className="relative rounded-2xl border border-gray-800 p-8 bg-gradient-to-b from-gray-900 to-black hover:border-gray-700 transition-all duration-300">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                <span className="text-xl font-semibold">3</span>
              </div>
              <h3 className="text-xl font-semibold">Instant Registration</h3>
              <p className="mt-4 text-gray-400">Get your domain registered and ready to use</p>
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
