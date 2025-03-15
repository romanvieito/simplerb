import React from "react";
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CPricing from "../components/CPricing";
import { Container } from "@mui/material";
import CFAQ from "../components/CFAQ";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Pricing - Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black/95 z-0"></div>
        <Container maxWidth="lg" className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold mb-6 tracking-tight">
              Simple{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
                Transparent
              </span>{" "}
              Pricing
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Pick the perfect plan for you—clear value, no hidden fees.
            </p>
          </div>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-black relative">
        <Container maxWidth="lg">
          <div className="relative z-10">
            <CPricing />
          </div>
          {/* Decorative gradient blur */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black">
        <Container maxWidth="lg">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600">
              Frequently Asked Questions
            </span>
          </h2>
          <CFAQ />
        </Container>
      </section>

      <Footer />
    </div>
  );
}
