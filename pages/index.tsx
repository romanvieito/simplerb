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
          <div className="max-w-4xl mx-auto text-center">
            {/* Digital Importance Message */}
            <div className="mb-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full border border-orange-500/20">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-orange-400 font-medium text-sm uppercase tracking-wide">Digital is more important than ever</span>
              </div>
            </div>

            {/* Tool Name */}
            <div className="mb-6 animate-fade-in-up animation-delay-200">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-lg">
                simplerB
              </h1>
            </div>

            {/* Main Value Proposition */}
            <div className="mb-8 animate-fade-in-up animation-delay-400">
              <div className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-tight">
                <span className="text-white">1 tool</span>
                <span className="text-purple-400 mx-4">+</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">AI</span>
                <span className="text-white ml-4">=</span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse">
                  Small Business Growth
                </span>
              </div>
            </div>

            {/* Simple Description */}
            <div className="mb-12 animate-fade-in-up animation-delay-600">
              <p className="text-xl md:text-2xl text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed">
                Everything you need to establish your digital presence and grow your business online.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <span className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">Find Domains</span>
                <span className="px-4 py-2 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">Build Websites</span>
                <span className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">Create Ads</span>
                <span className="px-4 py-2 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">AI-Powered</span>
              </div>
            </div>

            {/* Simple CTA */}
            <div className="animate-fade-in-up animation-delay-800">
              <a
                href={pages[0].link}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-white to-gray-100 text-black rounded-full font-bold hover:from-gray-100 hover:to-white transition-all duration-300 shadow-2xl hover:shadow-white/20 text-lg transform hover:scale-105 active:scale-95 border-2 border-transparent hover:border-white/20"
                onClick={handleGetStarted}
              >
                <span>🚀 Start Growing Today</span>
                <span className="text-sm opacity-75">— Free</span>
              </a>

              <SignedOut>
                <div className="mt-6">
                  <button
                    onClick={handleSignIn}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-sm underline underline-offset-4"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </SignedOut>
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

      {/* AI Business Generator Section */}
      <section className="py-32 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(147,51,234,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.05),transparent_70%)]"></div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20 mb-8">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-purple-400 font-medium text-sm uppercase tracking-wide">AI Business Generator</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-500 to-cyan-400">
                Turn Ideas Into Revenue
              </span>
              <br />
              <span className="text-2xl md:text-3xl text-gray-300 font-light">
                with AI-Powered Automation
              </span>
            </h2>

            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
              Experience the future of business creation. Our AI analyzes markets, generates strategies, and builds your complete digital presence automatically.
            </p>

            {/* AI capabilities badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-full border border-cyan-500/20 mb-8">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-cyan-400 font-medium text-sm">🤖 AI-Powered Business Intelligence</span>
            </div>
          </div>

          {/* AI capabilities showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Smart Domain Discovery",
                description: "AI instantly finds available domains that match your business idea and validates their market potential before you buy.",
                icon: "🔍",
                ai_feature: "Automated Validation",
                impact: "Perfect domains in 30 seconds"
              },
              {
                title: "AI Website Builder",
                description: "Transform your idea into a professional website automatically. AI designs, writes content, and optimizes for conversions.",
                icon: "⚡",
                ai_feature: "One-Click Launch",
                impact: "From idea to live site in minutes"
              },
              {
                title: "Revenue-Focused Ads",
                description: "AI creates and optimizes ad campaigns that turn your ideas into paying customers with automated A/B testing and bidding.",
                icon: "📈",
                ai_feature: "Conversion Optimization",
                impact: "Generate revenue while you sleep"
              }
            ].map((capability, index) => (
              <div key={index} className="group">
                <div className="h-full p-8 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 transform hover:-translate-y-1 relative overflow-hidden">
                  {/* AI indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full border border-purple-500/30">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-purple-400 font-medium">AI</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {capability.icon}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300">
                    {capability.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {capability.description}
                  </p>

                  {/* AI Feature Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-500/20 mb-3">
                    <span className="text-xs text-blue-400 font-medium">{capability.ai_feature}</span>
                  </div>

                  {/* Impact */}
                  <div className="text-sm text-purple-400 font-semibold">
                    {capability.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Performance Metrics */}
          <div className="text-center mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "AI Accuracy", value: "94%", icon: "🎯", subtitle: "Market predictions" },
                { label: "Time Saved", value: "40hrs", icon: "⚡", subtitle: "Per month" },
                { label: "Revenue Boost", value: "3.2x", icon: "📈", subtitle: "Average growth" },
                { label: "Success Rate", value: "87%", icon: "🏆", subtitle: "Business launches" }
              ].map((metric, index) => (
                <div key={index} className="group text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {metric.icon}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors duration-300">
                    {metric.value}
                  </div>
                  <div className="text-sm font-semibold text-gray-300 mb-1">
                    {metric.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {metric.subtitle}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Trust indicators */}
          <div className="text-center">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400 mb-12">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>AI-Powered Insights</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-200"></div>
                <span>Real-time Optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse animation-delay-400"></div>
                <span>Adaptive Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse animation-delay-600"></div>
                <span>Creator Focused</span>
              </div>
            </div>

            {/* AI-powered CTA */}
            <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-full border border-purple-500/20 backdrop-blur-sm hover:border-purple-400/40 transition-all duration-300 cursor-pointer group">
              <span className="text-purple-400 font-semibold group-hover:text-purple-300 transition-colors duration-300">
                Experience AI Business Generation →
              </span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-500">Beta Access</span>
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