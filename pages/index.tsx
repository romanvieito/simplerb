import React, { useEffect } from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';
import { Container } from '@mui/material';
import { useClerk, useUser, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import CFAQ from '../components/CFAQ';
import { trackConversion } from '../utils/analytics';

const operatingSystemPoints = [
  'Thinks through opportunities and next moves',
  'Builds websites, campaigns, and growth assets',
  'Markets your projects continuously',
  'Learns from data and improves over time',
];

const workflowSteps = [
  {
    title: 'You give it a direction',
    description:
      'Start with an idea, a product, or a problem worth solving. SimplerB turns that into an execution plan.',
  },
  {
    title: 'It builds and launches',
    description:
      'It plans, writes, codes, and ships the assets needed to get the project live.',
  },
  {
    title: 'It keeps working',
    description:
      'While you sleep, SimplerB keeps promoting, testing, adapting to signals, and finding the next improvement.',
  },
];

const proofPoints = [
  '24/7 execution loop',
  'Autonomous planning and building',
  'Continuous marketing iteration',
  'Data-driven self-improvement',
];

const Home: NextPage = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  const handlePrimaryClick = () => {
    trackConversion('get_started', '/dashboard');
    openSignIn();
  };

  const handleSecondaryClick = () => {
    trackConversion('feature_click', '/pricing');
    router.push('/pricing');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#fbf7ef] text-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
          <p className="mt-4 text-sm text-stone-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf7ef] text-stone-900">
      <Head>
        <title>simplerB</title>
        <meta
          name="description"
          content="simplerB is AI that runs your company while you sleep — thinking, building, and marketing your projects autonomously."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <section className="border-b border-stone-200">
          <Container maxWidth="lg" className="px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-black tracking-tight text-[#1f6f43]">simplerB</div>
                <p className="mt-1 text-sm text-stone-600">AI that keeps your company moving.</p>
              </div>
              <SignedOut>
                <button
                  onClick={handlePrimaryClick}
                  className="rounded-full border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Get started
                </button>
              </SignedOut>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#fffdf8]">
          <Container maxWidth="lg" className="px-6 py-20 md:py-28">
            <div className="grid gap-14 md:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] md:items-start">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-[#d9eadf] bg-[#eef7f1] px-4 py-1.5 text-sm font-semibold text-[#1f6f43]">
                  New mission
                </div>
                <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-stone-900 md:text-7xl">
                  AI that runs your company while you sleep.
                </h1>
                <p className="mt-6 max-w-2xl text-xl leading-8 text-stone-700 md:text-2xl">
                  SimplerB thinks, builds, and markets your projects autonomously. It plans, codes, and promotes your ideas continuously — operating 24/7, adapting to data, and improving itself without human intervention.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <SignedOut>
                    <button
                      onClick={handlePrimaryClick}
                      className="rounded-full bg-[#1f6f43] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#195b37]"
                    >
                      Start with simplerB
                    </button>
                  </SignedOut>
                  <button
                    onClick={handleSecondaryClick}
                    className="rounded-full border border-stone-300 bg-white px-6 py-3.5 text-base font-semibold text-stone-900 transition hover:border-stone-400 hover:bg-stone-50"
                  >
                    View pricing
                  </button>
                </div>

                <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-stone-600">
                  {proofPoints.map((point) => (
                    <div key={point} className="flex items-center gap-2">
                      <span className="text-[#1f6f43]">●</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_20px_50px_rgba(28,26,23,0.08)]">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">What it does</p>
                <ul className="mt-6 space-y-4">
                  {operatingSystemPoints.map((item) => (
                    <li key={item} className="flex gap-3 text-lg leading-7 text-stone-800">
                      <span className="mt-1 text-[#1f6f43]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 rounded-3xl bg-[#f5f1e8] p-5">
                  <p className="text-sm font-semibold text-stone-500">Positioning</p>
                  <p className="mt-2 text-xl font-bold leading-8 text-stone-900">
                    Your autonomous operator for ideas that need to ship, sell, and improve.
                  </p>
                </div>
              </aside>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                Give it a project. It keeps the wheel turning.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="rounded-[1.75rem] border border-stone-200 bg-white p-8">
                  <div className="text-sm font-bold text-[#1f6f43]">0{index + 1}</div>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">{step.title}</h3>
                  <p className="mt-4 text-lg leading-8 text-stone-700">{step.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#f3efe5]">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Why this matters</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                  Most companies stop when people stop working.
                </h2>
              </div>
              <div className="space-y-6 text-xl leading-9 text-stone-700">
                <p>
                  SimplerB is built around a simple idea: your best projects should not stall because the workday ends.
                </p>
                <p>
                  It keeps momentum alive by planning the next move, building what is missing, promoting what is ready, and adjusting to real-world feedback continuously.
                </p>
                <p className="font-semibold text-stone-900">
                  Less waiting. Less coordination drag. More output.
                </p>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-white">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="rounded-[2.25rem] bg-[#1f6f43] px-8 py-10 text-white md:px-12 md:py-14">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-100">Ready when you are</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                  Put an autonomous company operator behind your next project.
                </h2>
                <p className="mt-5 text-xl leading-8 text-green-50">
                  If the mission is clear, simplerB can start thinking, building, and marketing around it right away.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SignedOut>
                  <button
                    onClick={handlePrimaryClick}
                    className="rounded-full bg-white px-6 py-3.5 text-base font-semibold text-[#1f6f43] transition hover:bg-green-50"
                  >
                    Get started
                  </button>
                </SignedOut>
                <button
                  onClick={handleSecondaryClick}
                  className="rounded-full border border-white/30 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-white/10"
                >
                  See plans
                </button>
              </div>
            </div>
          </Container>
        </section>

        <section className="bg-[#fbf7ef] py-20 md:py-24">
          <Container maxWidth="lg" className="px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">Questions</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                The basics, without the fluff.
              </h2>
            </div>
            <div className="mt-10">
              <CFAQ />
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
