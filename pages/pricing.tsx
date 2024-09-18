import React from "react";
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CPricing from "../components/CPricing";
import { Container } from "@mui/material";
import CFAQ from "../components/CFAQ";

export default function PricingPage() {
  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <div>
          <CPricing />
          {/* FAQ Section */}
          <section className="w-full bg-white py-16">
            <Container maxWidth="lg">
              {/* <h2 className="text-3xl font-semibold mb-8 text-center">Choose Your Plan</h2> */}
              <CFAQ />
            </Container>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
