import React, { useEffect } from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import { Box, Button, Container, Grid } from "@mui/material";
import { useClerk, useUser, SignedOut } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import type { NextPage } from "next";
import CPricing from '../components/CPricing';
import CFAQ from '../components/CFAQ';
import { Language, Web, Email, Campaign, Login, Dashboard } from '@mui/icons-material';
import { trackConversion } from '../utils/analytics';

const Home: NextPage = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openSignIn } = useClerk();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard');
    }
  }, [isLoaded, user, router]);

  const pages = [{
    name: 'Domain Generator',
    link: '/domain',
    icon: Language,
    description: 'Find the perfect domain that matches your brand and vision. Check availability instantly.',
    features: ['Instant availability check', 'Domain suggestions', 'Premium domains', 'Bulk search']
  }, {
    name: 'Website Builder',
    link: '/web',
    icon: Web,
    description: 'Create stunning websites in minutes with our drag-and-drop builder. No coding required.',
    features: ['Drag & drop editor', 'Mobile responsive', 'SEO optimized', 'Custom domains']
  }, {
    name: 'Ads Generator',
    link: '/ads',
    icon: Campaign,
    description: 'Generate high-converting ad copy and creatives that drive results for your campaigns.',
    features: ['AI-powered copy', 'Multiple formats', 'A/B testing', 'Performance tracking']
  }, {
    name: 'Keywords Planner',
    link: '/find-keywords',
    icon: Dashboard,
    description: 'Discover profitable keywords with search volume, competition data, and trend analysis.',
    features: ['Search volume data', 'Competition analysis', 'Trend insights', 'CPC estimates']
  }];

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

  // Show loading state while checking authentication
  if (!isLoaded) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-2 min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-black to-purple-900/20 z-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)] z-0"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.1),transparent_50%)] z-0"></div>

        <Container maxWidth="lg" className="relative z-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Tool Name */}
            <div className="mb-6 animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-lg">
                simplerB
              </h1>
            </div>

            {/* Main Headline */}
            <div className="mb-8 animate-fade-in-up animation-delay-200">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 tracking-tight leading-none">
                Grow digital
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-500 animate-pulse">
                  with ease
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <div className="mb-12 animate-fade-in-up animation-delay-400">
              <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed font-light">
                Everything you need to build, launch, and scale your digital presence.
                <span className="block mt-2 text-lg md:text-xl text-gray-400 font-normal">
                  Find domains • Build websites • Create ads • Connect with email
                </span>
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-fade-in-up animation-delay-600">
              <a
                href={pages[0].link}
                className="group relative px-10 py-5 bg-gradient-to-r from-white to-gray-100 text-black rounded-full font-bold hover:from-gray-100 hover:to-white transition-all duration-300 shadow-2xl hover:shadow-white/20 text-xl transform hover:scale-105 active:scale-95 border-2 border-transparent hover:border-white/20"
                onClick={handleGetStarted}
              >
                <span className="relative z-10 flex items-center gap-3">
                  🚀 Get Started Free
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>

              <SignedOut>
                <button
                  onClick={handleSignIn}
                  className="group relative px-10 py-5 border-2 border-gray-600 rounded-full font-semibold hover:border-white hover:bg-white/5 transition-all duration-300 text-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-white/20 backdrop-blur-sm"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Login sx={{ fontSize: '1.5rem' }} />
                    Sign In
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </SignedOut>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 animate-fade-in-up animation-delay-800">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-500"></div>
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse animation-delay-1000"></div>
                  <span>Built for creators</span>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Floating elements for visual interest */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-32 right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl animate-float animation-delay-1000"></div>
        <div className="absolute top-1/2 right-8 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-float animation-delay-500"></div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-gradient-to-b from-black via-gray-900/50 to-black relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]"></div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                Everything You Need
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Powerful tools designed specifically for creators and entrepreneurs to build, launch, and scale their digital presence.
            </p>
          </div>

          <Grid container spacing={8} justifyContent="center">
            {pages.map((page, index) => (
              <Grid item xs={12} md={6} key={page.name}>
                <a
                  href={page.link}
                  className="block group h-full"
                  onClick={(e) => handleFeatureClick(e, page.name, page.link)}
                >
                  <div className="h-full p-8 rounded-3xl bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-sm border border-gray-700/50 group-hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 transform hover:-translate-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 group-hover:from-blue-500/30 group-hover:to-indigo-500/30 transition-all duration-300">
                          {React.createElement(page.icon, { className: "text-blue-400 text-2xl group-hover:text-blue-300 transition-colors duration-300" })}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors duration-300">{page.name}</h3>
                          <div className="w-0 group-hover:w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500"></div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-300 mb-6 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                      {page.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                      {page.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full group-hover:bg-blue-300 transition-colors duration-300"></div>
                          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-semibold group-hover:text-blue-300 transition-colors duration-300">
                        Start using →
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-300">
                        <span>Free</span>
                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                        <span>No setup</span>
                      </div>
                    </div>
                  </div>
                </a>
              </Grid>
            ))}
          </Grid>

          {/* Bottom CTA */}
          <div className="text-center mt-20">
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-full border border-blue-500/20 backdrop-blur-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-medium">Ready to get started? All tools are free to try.</span>
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </Container>
      </section>

      {/* Video Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 via-black to-gray-900 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(139,69,19,0.1),transparent_70%)]"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full border border-orange-500/20 mb-8">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-400 font-medium text-sm uppercase tracking-wide">See it in action</span>
              </div>

              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-red-400 to-pink-400">
                  Build Faster.
                </span>
                <br />
                <span className="text-white">Launch Smarter.</span>
              </h2>

              <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Watch how creators are using simplerB to transform their ideas into successful digital businesses in minutes, not months.
              </p>
            </div>

            {/* Video container */}
            <div className="relative">
              {/* Video glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-50"></div>

              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-700/50">
                <div className="aspect-video relative">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                    loop
                    poster="/video-thumbnail.jpg"
                    preload="metadata"
                  >
                    <source src="/simplerB.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Video overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

                  {/* Play button overlay (when paused) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/20">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all duration-300 cursor-pointer">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Video stats */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center justify-between text-white/80 text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live Demo</span>
                      </div>
                      <div className="w-px h-4 bg-white/30"></div>
                      <span>2:34</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">HD</span>
                      <div className="w-1 h-1 bg-white/50 rounded-full"></div>
                      <span className="text-xs">4K</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats below video */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
              {[
                { number: '5,000+', label: 'Domains Found' },
                { number: '2,300+', label: 'Sites Created' },
                { number: '15,000+', label: 'Ads Generated' },
                { number: '98%', label: 'User Satisfaction' }
              ].map((stat, index) => (
                <div key={index} className="group">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors duration-300">
                    {stat.number}
                  </div>
                  <div className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Social Proof Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.05),transparent_70%)]"></div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full border border-green-500/20 mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium text-sm uppercase tracking-wide">Join the journey</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                Be among the first creators
              </span>
            </h2>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              We're building something special for creators like you. Join our early community and shape the future of digital creation.
            </p>

            {/* Early access badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-full border border-amber-500/20 mb-8">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-amber-400 font-medium text-sm">🚀 Early Access Available</span>
            </div>
          </div>

          {/* Future testimonials - what users will say */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                quote: "This is exactly what I've been waiting for. Finally, tools that understand how creators actually work.",
                author: "Alex Rivera",
                role: "Indie Creator",
                avatar: "AR",
                type: "future"
              },
              {
                quote: "The amount of time and money this saves is incredible. I launched my entire online presence in one afternoon.",
                author: "Jordan Blake",
                role: "Digital Entrepreneur",
                avatar: "JB",
                type: "future"
              },
              {
                quote: "simplerB made going digital feel effortless. I went from idea to launched business without the usual headaches.",
                author: "Taylor Morgan",
                role: "Creative Professional",
                avatar: "TM",
                type: "future"
              }
            ].map((testimonial, index) => (
              <div key={index} className="group">
                <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 transform hover:-translate-y-1 relative">
                  {/* Future indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/30">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-400 font-medium">Coming Soon</span>
                    </div>
                  </div>

                  {/* Quote */}
                  <blockquote className="text-gray-300 mb-6 leading-relaxed italic pt-4">
                    "{testimonial.quote}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg opacity-75">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white group-hover:text-green-400 transition-colors duration-300">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Growth indicators */}
          <div className="text-center mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Beta testers", value: "Growing daily", icon: "👥" },
                { label: "Tools launched", value: "4 complete", icon: "🛠️" },
                { label: "Domains found", value: "Hundreds", icon: "🔍" },
                { label: "Happy creators", value: "Every day", icon: "🎯" }
              ].map((stat, index) => (
                <div key={index} className="group text-center">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-lg font-bold text-white mb-1 group-hover:text-green-400 transition-colors duration-300">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust indicators for startups */}
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 mb-12">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
                <span>Secure & private</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span>Lightning fast</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Built for creators</span>
              </div>
            </div>

            {/* Call to action */}
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-full border border-green-500/20 backdrop-blur-sm hover:border-green-400/40 transition-all duration-300 cursor-pointer group">
              <span className="text-green-400 font-semibold group-hover:text-green-300 transition-colors duration-300">
                Join our beta community →
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500">Limited spots</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing Section */}
      <section className="py-32 bg-black relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.05),transparent_70%)]"></div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">
                Choose Your Plan
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Start free and upgrade as you grow. All plans include access to all tools.
            </p>
          </div>
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