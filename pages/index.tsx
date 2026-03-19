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
  'It decides what to do next.',
  'It builds what the project needs.',
  'It markets what is ready to sell.',
  'It keeps learning from results.',
];

const walkthrough = [
  {
    title: 'Start with a direction, not a staffing plan.',
    description:
      'Give simplerB an idea, a business, or a project. It turns that into an execution track instead of another pile of unfinished thinking.',
  },
  {
    title: 'It plans, writes, codes, and ships.',
    description:
      'Pages, campaigns, assets, copy, iterations. SimplerB handles the actual making — not just the brainstorming.',
  },
  {
    title: 'It keeps going after you stop for the day.',
    description:
      'While you sleep, it keeps promoting, adapting, refining, and pushing the project forward based on what the numbers say.',
  },
];

const yesList = [
  'Can it keep working after I log off?',
  'Can it build and market at the same time?',
  'Can it adapt when performance changes?',
  'Can it help a small team move like a much bigger one?',
  'Can I still decide the direction and constraints?',
  'Can it operate continuously instead of waiting for prompts all day?',
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
      <div className="min-h-screen bg-[#f7f3ea] text-stone-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800" />
          <p className="mt-4 text-sm text-stone-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-stone-900">
      <Head>
        <title>simplerB</title>
        <meta
          name="description"
          content="simplerB is AI that runs your company while you sleep — thinking, building, and marketing your projects autonomously."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <section className="border-b border-stone-200 bg-[#fbf8f0]">
          <Container maxWidth="lg" className="px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-black tracking-tight text-[#1f6f43]">simplerB</div>
                <span className="hidden md:inline text-sm text-stone-500">AI that runs your company while you sleep.</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSecondaryClick}
                  className="hidden sm:inline text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-stone-900"
                >
                  Pricing
                </button>
                <SignedOut>
                  <button
                    onClick={handlePrimaryClick}
                    className="rounded-full border border-stone-900 bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    Get started
                  </button>
                </SignedOut>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#fbf8f0]">
          <Container maxWidth="lg" className="px-6 py-16 md:py-24">
            <div className="max-w-5xl">
              <div className="inline-flex rounded-full bg-[#e7f2e9] px-4 py-1.5 text-sm font-bold text-[#1f6f43]">
                New mission
              </div>
              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.95] tracking-tight text-stone-900 md:text-7xl">
                AI that runs your company while you sleep.
              </h1>
              <p className="mt-6 max-w-4xl text-2xl leading-9 text-stone-700">
                SimplerB thinks, builds, and markets your projects autonomously. It plans, codes, and promotes your ideas continuously — operating 24/7, adapting to data, and improving itself without human intervention.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SignedOut>
                  <button
                    onClick={handlePrimaryClick}
                    className="rounded-full bg-[#1f6f43] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#195b37]"
                  >
                    Start with simplerB
                  </button>
                </SignedOut>
                <button
                  onClick={handleSecondaryClick}
                  className="rounded-full border border-stone-300 bg-white px-6 py-3.5 text-base font-bold text-stone-900 transition hover:bg-stone-50"
                >
                  See plans
                </button>
              </div>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
              <div className="rounded-[1.75rem] border border-stone-200 bg-white p-7">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">In plain English</div>
                <p className="mt-4 text-3xl font-black leading-[1.15] tracking-tight text-stone-900">
                  SimplerB is your autonomous operator for ideas that need to ship, sell, and improve.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-stone-200 bg-[#f2ecdf] p-7">
                <div className="text-sm font-bold uppercase tracking-[0.14em] text-stone-500">What it keeps doing</div>
                <ul className="mt-4 space-y-3">
                  {operatingSystemPoints.map((item) => (
                    <li key={item} className="flex gap-3 text-xl leading-8 text-stone-800">
                      <span className="text-[#1f6f43]">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <section id="features" className="border-b border-stone-200 bg-white">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                Let’s walk through it.
              </h2>
              <p className="mt-4 text-xl leading-8 text-stone-700">
                This is not about another dashboard full of ideas. It is about continuous execution.
              </p>
            </div>

            <div className="mt-14 space-y-14">
              {walkthrough.map((step, index) => (
                <div key={step.title} className="grid gap-6 border-t border-stone-200 pt-10 md:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="text-lg font-black text-[#1f6f43]">0{index + 1}</div>
                  <div className="max-w-4xl">
                    <h3 className="text-3xl font-black tracking-tight text-stone-900 md:text-[2.2rem] md:leading-[1.05]">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-xl leading-9 text-stone-700">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#f2ecdf]">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                  Most companies stop when people stop working.
                </h2>
              </div>
              <div>
                <p className="text-xl leading-9 text-stone-700">
                  SimplerB is built around a simple idea: your best projects should not lose momentum just because the day ends.
                </p>
                <p className="mt-6 text-xl leading-9 text-stone-700">
                  It keeps the cycle moving by deciding what to do next, building what matters, marketing what is ready, and adjusting based on outcomes.
                </p>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-white">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                The answer is YES.
              </h2>
              <p className="mt-4 text-xl leading-8 text-stone-700">
                If you’re wondering whether simplerB is meant to actually move the business forward instead of just assisting around the edges — yes.
              </p>
            </div>

            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {yesList.map((item) => (
                <li key={item} className="rounded-[1.25rem] border border-stone-200 bg-[#fbf8f0] px-6 py-5 text-lg leading-8 text-stone-800">
                  {item}
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#fbf8f0]">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="max-w-5xl">
              <h2 className="text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                Small teams should be able to move like companies with far more people.
              </h2>
              <p className="mt-6 text-2xl leading-9 text-stone-700">
                That is the promise here. Not more busywork. Not more dashboards. Not more prompts for every tiny step.
              </p>
              <p className="mt-6 text-2xl leading-9 text-stone-700">
                SimplerB exists to keep execution alive: thinking, building, launching, promoting, and improving without needing constant human babysitting.
              </p>
            </div>
          </Container>
        </section>

        <section className="border-b border-stone-200 bg-[#1f6f43] text-white">
          <Container maxWidth="lg" className="px-6 py-20 md:py-24">
            <div className="max-w-4xl">
              <h2 className="text-4xl font-black tracking-tight md:text-5xl">
                You wouldn’t be here if the usual way of building companies was working well enough.
              </h2>
              <p className="mt-5 text-2xl leading-9 text-green-50">
                Put an autonomous company operator behind your next project.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SignedOut>
                <button
                  onClick={handlePrimaryClick}
                  className="rounded-full bg-white px-6 py-3.5 text-base font-bold text-[#1f6f43] transition hover:bg-green-50"
                >
                  Get started
                </button>
              </SignedOut>
              <button
                onClick={handleSecondaryClick}
                className="rounded-full border border-white/30 px-6 py-3.5 text-base font-bold text-white transition hover:bg-white/10"
              >
                View pricing
              </button>
            </div>
          </Container>
        </section>

        <section className="bg-[#f7f3ea] py-20 md:py-24">
          <Container maxWidth="lg" className="px-6">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div className="max-w-xl">
                <div className="inline-flex rounded-full bg-white px-4 py-1.5 text-sm font-bold text-stone-700 ring-1 ring-stone-200">
                  Questions
                </div>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-stone-900 md:text-5xl">
                  I have questions.
                </h2>
                <p className="mt-5 text-xl leading-8 text-stone-700">
                  Fair. A product making claims this big should answer them clearly.
                </p>
              </div>
              <div>
                <CFAQ />
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
