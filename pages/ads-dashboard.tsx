import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import AuthGuard from '../components/AuthGuard';

interface Campaign {
  id: string;
  name: string;
  status: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  budget: number;
  budgetUtilization: number;
  qualityScore?: number;
  impressionShare?: number;
  rankLostImpressionShare?: number;
  rankLostTopImpressionShare?: number;
}

interface Metrics {
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
  averageCtr: number;
  averageCpc: number;
  averageConversionRate: number;
  averageCpa: number;
  averageRoas: number;
  totalBudget: number;
  budgetUtilization: number;
  campaigns: Campaign[];
  performance: {
    bestPerformingCampaign: string;
    worstPerformingCampaign: string;
    topKeywords: any[];
    recommendations: string[];
  };
}

// Helper function to parse inline formatting (bold, percentages, dollar amounts)
function parseInlineFormatting(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Pattern to match bold text (**text**), percentages, dollar amounts, and metrics
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, className: 'font-semibold text-gray-900' },
    { regex: /(\$[\d,]+\.?\d*)/g, className: 'font-medium text-green-600' },
    { regex: /(\d+\.?\d*%)/g, className: 'font-medium text-blue-600' },
    { regex: /(\d+\.?\d*x)/g, className: 'font-medium text-purple-600' },
  ];

  while (remaining) {
    interface MatchInfo {
      index: number;
      length: number;
      content: string;
      className: string;
    }
    
    let earliestMatch: MatchInfo | null = null;

    // Find the earliest match among all patterns
    for (const { regex, className } of patterns) {
      regex.lastIndex = 0;
      const match = regex.exec(remaining);
      if (match) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = {
            index: match.index,
            length: match[0].length,
            content: match[1] || match[0],
            className
          };
        }
      }
    }

    if (!earliestMatch) {
      parts.push(remaining);
      break;
    }

    // Add text before the match
    if (earliestMatch.index > 0) {
      parts.push(remaining.substring(0, earliestMatch.index));
    }

    // Add the formatted match
    parts.push(
      <span key={`inline-${keyCounter++}`} className={earliestMatch.className}>
        {earliestMatch.content}
      </span>
    );

    // Continue with remaining text
    remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
  }

  return parts;
}

// Helper function to format AI analysis text into styled React elements
function formatAnalysis(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let currentSection: JSX.Element[] = [];
  let sectionKey = 0;

  const flushSection = () => {
    if (currentSection.length > 0) {
      elements.push(
        <div key={`section-${sectionKey++}`} className="space-y-2">
          {currentSection}
        </div>
      );
      currentSection = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      flushSection();
      return;
    }

    // Main section headers (all caps or numbered with caps)
    if (/^\d+\.\s+[A-Z\s&]+$/.test(trimmedLine)) {
      flushSection();
      elements.push(
        <div key={`header-${idx}`} className="mt-6 mb-4 first:mt-0">
          <h3 className="text-xl font-bold text-gray-900 border-b-2 border-purple-500 pb-2">
            {trimmedLine}
          </h3>
        </div>
      );
      return;
    }

    // Subsection headers (with colons)
    if (trimmedLine.endsWith(':') && trimmedLine.split(' ').length <= 6) {
      flushSection();
      currentSection.push(
        <h4 key={`subheader-${idx}`} className="text-lg font-semibold text-gray-800 mt-4 mb-2 first:mt-0">
          {trimmedLine}
        </h4>
      );
      return;
    }

    // Bullet points (starting with -, *, or •)
    if (/^[-*•]\s+/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^[-*•]\s+/, '');
      currentSection.push(
        <div key={`bullet-${idx}`} className="flex items-start space-x-3 ml-4">
          <span className="text-purple-600 mt-1.5 flex-shrink-0 font-bold">•</span>
          <p className="text-gray-700 leading-relaxed flex-1">
            {parseInlineFormatting(content)}
          </p>
        </div>
      );
      return;
    }

    // Numbered points (but not section headers)
    if (/^\d+\.\s+/.test(trimmedLine) && !/^[A-Z\s&]+$/.test(trimmedLine)) {
      const numberMatch = trimmedLine.match(/^(\d+\.)\s+(.+)$/);
      if (numberMatch) {
        currentSection.push(
          <div key={`numbered-${idx}`} className="flex items-start space-x-3 ml-4">
            <span className="text-purple-600 font-semibold flex-shrink-0 min-w-[1.5rem]">
              {numberMatch[1]}
            </span>
            <p className="text-gray-700 leading-relaxed flex-1">
              {parseInlineFormatting(numberMatch[2])}
            </p>
          </div>
        );
        return;
      }
    }

    // Regular paragraphs
    currentSection.push(
      <p key={`text-${idx}`} className="text-gray-700 leading-relaxed">
        {parseInlineFormatting(trimmedLine)}
      </p>
    );
  });

  flushSection();
  return elements;
}

function AdsDashboardContent() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'last7days'>(() => {
    // Load from localStorage on component mount, default to 'last7days'
    if (typeof window !== 'undefined') {
      const savedFilter = localStorage.getItem('ads-dashboard-time-filter');
      return (savedFilter as 'today' | 'yesterday' | 'last7days') || 'last7days';
    }
    return 'last7days';
  });
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>(() => {
    // Load from localStorage on component mount, default all columns visible
    if (typeof window !== 'undefined') {
      const savedColumns = localStorage.getItem('ads-dashboard-visible-columns');
      if (savedColumns) {
        return JSON.parse(savedColumns);
      }
    }
    return {
      campaign: true,
      status: true,
      impressions: true,
      clicks: true,
      spend: true,
      conversions: true,
      ctr: true,
      cpa: true,
      budgetUtil: true,
      impressionShare: true,
      rankLostImpressionShare: false,
      rankLostTopImpressionShare: false
    };
  });
  const [boostLoading, setBoostLoading] = useState(false);
  const [boostResult, setBoostResult] = useState<string | null>(null);
  const [showBoostModal, setShowBoostModal] = useState(false);

  // Function to update time filter and save to localStorage
  const updateTimeFilter = (newFilter: 'today' | 'yesterday' | 'last7days') => {
    setTimeFilter(newFilter);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ads-dashboard-time-filter', newFilter);
    }
  };

  // Function to update column visibility and save to localStorage
  const updateColumnVisibility = (column: string, isVisible: boolean) => {
    const newVisibleColumns = { ...visibleColumns, [column]: isVisible };
    setVisibleColumns(newVisibleColumns);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ads-dashboard-visible-columns', JSON.stringify(newVisibleColumns));
    }
  };

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user, timeFilter]);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColumnSelector) {
        const target = event.target as HTMLElement;
        if (!target.closest('.column-selector')) {
          setShowColumnSelector(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  const getDateRange = (filter: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7days = new Date(today);
    last7days.setDate(last7days.getDate() - 7);

    switch (filter) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      case 'last7days':
        return {
          startDate: last7days.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      default:
        return {
          startDate: last7days.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
    }
  };

  const fetchMetrics = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError('User email not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const dateRange = getDateRange(timeFilter);
      
      // Use specific start and end dates for precise filtering
      const response = await fetch(`/api/google-ads/metrics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        method: 'GET',
        headers: { 
          'x-user-email': user.primaryEmailAddress.emailAddress 
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const prepareBoostData = () => {
    if (!metrics) return null;

    // Get visible column labels
    const visibleColumnLabels = Object.entries(visibleColumns)
      .filter(([_, isVisible]) => isVisible)
      .map(([key]) => key);

    // Filter campaign data to only include visible columns
    const filteredCampaigns = metrics.campaigns.map(campaign => {
      const filteredCampaign: any = {};
      
      if (visibleColumns.campaign) {
        filteredCampaign.name = campaign.name;
        filteredCampaign.type = campaign.type;
      }
      if (visibleColumns.status) filteredCampaign.status = campaign.status;
      if (visibleColumns.impressions) filteredCampaign.impressions = campaign.impressions;
      if (visibleColumns.clicks) filteredCampaign.clicks = campaign.clicks;
      if (visibleColumns.spend) filteredCampaign.cost = campaign.cost;
      if (visibleColumns.conversions) {
        filteredCampaign.conversions = campaign.conversions;
        filteredCampaign.conversionValue = campaign.conversionValue;
      }
      if (visibleColumns.ctr) filteredCampaign.ctr = campaign.ctr;
      if (visibleColumns.cpa) {
        filteredCampaign.cpa = campaign.cpa;
        filteredCampaign.roas = campaign.roas;
      }
      if (visibleColumns.budgetUtil) {
        filteredCampaign.budget = campaign.budget;
        filteredCampaign.budgetUtilization = campaign.budgetUtilization;
      }
      if (visibleColumns.impressionShare) filteredCampaign.impressionShare = campaign.impressionShare;
      if (visibleColumns.rankLostImpressionShare) filteredCampaign.rankLostImpressionShare = campaign.rankLostImpressionShare;
      if (visibleColumns.rankLostTopImpressionShare) filteredCampaign.rankLostTopImpressionShare = campaign.rankLostTopImpressionShare;
      
      return filteredCampaign;
    });

    return {
      timePeriod: timeFilter,
      visibleColumns: visibleColumnLabels,
      campaigns: filteredCampaigns,
      summary: {
        totalSpend: metrics.totalCost,
        totalConversions: metrics.totalConversions,
        totalConversionValue: metrics.totalConversionValue,
        averageCtr: metrics.averageCtr,
        averageCpc: metrics.averageCpc,
        averageConversionRate: metrics.averageConversionRate,
        averageCpa: metrics.averageCpa,
        averageRoas: metrics.averageRoas,
        totalBudget: metrics.totalBudget,
        budgetUtilization: metrics.budgetUtilization,
        totalImpressions: metrics.totalImpressions,
        totalClicks: metrics.totalClicks
      }
    };
  };

  const handleBoostClick = async () => {
    const boostData = prepareBoostData();
    if (!boostData) {
      setError('No data available to analyze');
      return;
    }

    try {
      setBoostLoading(true);
      setShowBoostModal(true);
      setBoostResult(null);

      const response = await fetch('/api/google-ads/boost-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boostData),
      });

      const data = await response.json();

      if (data.success) {
        setBoostResult(data.analysis);
      } else {
        setBoostResult(`Error: ${data.error || 'Failed to analyze campaigns'}`);
      }
    } catch (err) {
      setBoostResult(`Error: ${(err as Error).message}`);
    } finally {
      setBoostLoading(false);
    }
  };


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Google Ads Dashboard - AdPilot</title>
      </Head>

      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Google Ads Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
              <div className="flex space-x-4">
              <button
                onClick={fetchMetrics}
                className="bg-gray-600 text-white p-2 rounded hover:bg-gray-700"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics?.totalCost || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Budget: {formatCurrency(metrics?.totalBudget || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(metrics?.totalConversions || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Value: {formatCurrency(metrics?.totalConversionValue || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average CTR</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatPercentage(metrics?.averageCtr || 0)}
            </p>
            <p className="text-sm text-gray-600">
              Clicks: {formatNumber(metrics?.totalClicks || 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Average CPA</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics?.averageCpa || 0)}
            </p>
            <p className="text-sm text-gray-600">
              ROAS: {metrics?.averageRoas?.toFixed(2) || 0}x
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {metrics?.performance?.recommendations && metrics.performance.recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recommendations</h2>
            <ul className="space-y-2">
              {metrics.performance.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}


        {/* Campaigns Table */}
        <div className="bg-white shadow rounded-lg overflow-visible">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Active Campaigns</h2>
              <div className="flex space-x-4 items-center">
                <div className="flex space-x-2">
                  <span className="text-sm text-gray-500 mr-3">Time Period:</span>
                  <button
                    onClick={() => updateTimeFilter('today')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeFilter === 'today'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => updateTimeFilter('yesterday')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeFilter === 'yesterday'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={() => updateTimeFilter('last7days')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeFilter === 'last7days'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Last 7 Days
                  </button>
                </div>

                {/* Boost Button */}
                <button
                  onClick={handleBoostClick}
                  disabled={boostLoading || !metrics?.campaigns?.length}
                  className={`flex items-center space-x-2 px-4 py-1 text-sm rounded-md transition-colors ${
                    boostLoading || !metrics?.campaigns?.length
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                  title="AI-powered campaign analysis"
                >
                  {boostLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Boost</span>
                    </>
                  )}
                </button>
                
                {/* Column Selector */}
                <div className="relative column-selector">
                  <button
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <span>Columns</span>
                    <svg className={`w-4 h-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showColumnSelector && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 column-selector">
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 mb-2">Show/Hide Columns</div>
                        <div className="space-y-1">
                          {Object.entries({
                            campaign: 'Campaign',
                            status: 'Status',
                            impressions: 'Impressions',
                            clicks: 'Clicks',
                            spend: 'Spend',
                            conversions: 'Conversions',
                            ctr: 'CTR',
                            cpa: 'CPA',
                            budgetUtil: 'Budget Util',
                            impressionShare: 'Impression Share',
                            rankLostImpressionShare: 'Rank Lost Imp. Share',
                            rankLostTopImpressionShare: 'Rank Lost Top Imp. Share'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={visibleColumns[key]}
                                onChange={(e) => updateColumnVisibility(key, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.campaign && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  {visibleColumns.impressions && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impressions
                    </th>
                  )}
                  {visibleColumns.clicks && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clicks
                    </th>
                  )}
                  {visibleColumns.spend && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spend
                    </th>
                  )}
                  {visibleColumns.conversions && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversions
                    </th>
                  )}
                  {visibleColumns.ctr && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CTR
                    </th>
                  )}
                  {visibleColumns.cpa && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPA
                    </th>
                  )}
                  {visibleColumns.budgetUtil && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Budget Util
                    </th>
                  )}
                  {visibleColumns.impressionShare && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Imp. Share
                    </th>
                  )}
                  {visibleColumns.rankLostImpressionShare && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank Lost
                    </th>
                  )}
                  {visibleColumns.rankLostTopImpressionShare && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Rank Lost
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics?.campaigns?.map((campaign) => (
                  <tr 
                    key={campaign.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedCampaign === campaign.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedCampaign(
                      selectedCampaign === campaign.id ? null : campaign.id
                    )}
                  >
                    {visibleColumns.campaign && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {campaign.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {campaign.type} • {formatNumber(campaign.impressions)} impressions
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          campaign.status === 'ENABLED' 
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.impressions && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(campaign.impressions)}
                      </td>
                    )}
                    {visibleColumns.clicks && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(campaign.clicks)}
                      </td>
                    )}
                    {visibleColumns.spend && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(campaign.cost)}
                      </td>
                    )}
                    {visibleColumns.conversions && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(campaign.conversions)}
                      </td>
                    )}
                    {visibleColumns.ctr && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(campaign.ctr)}
                      </td>
                    )}
                    {visibleColumns.cpa && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(campaign.cpa)}
                      </td>
                    )}
                    {visibleColumns.budgetUtil && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                campaign.budgetUtilization > 80 ? 'bg-green-500' :
                                campaign.budgetUtilization > 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(campaign.budgetUtilization, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatPercentage(campaign.budgetUtilization)}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.impressionShare && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage((campaign.impressionShare || 0) * 100)}
                      </td>
                    )}
                    {visibleColumns.rankLostImpressionShare && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage((campaign.rankLostImpressionShare || 0) * 100)}
                      </td>
                    )}
                    {visibleColumns.rankLostTopImpressionShare && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage((campaign.rankLostTopImpressionShare || 0) * 100)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Boost Modal */}
        {showBoostModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-gray-900">AI Campaign Analysis</h2>
                </div>
                <button
                  onClick={() => setShowBoostModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {boostLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 text-lg">Analyzing your campaigns...</p>
                    <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
                  </div>
                ) : boostResult ? (
                  <div className="space-y-6">
                    {formatAnalysis(boostResult)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500">No analysis available</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {boostResult && !boostLoading && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      if (boostResult) {
                        navigator.clipboard.writeText(boostResult);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setShowBoostModal(false)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AdsDashboard() {
  return (
    <AuthGuard>
      <AdsDashboardContent />
    </AuthGuard>
  );
}
