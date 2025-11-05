import React, { useState, useEffect, useRef } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { TablePagination } from "@mui/material";

const formatCpc = (micros?: number): string => {
  if (!micros) return 'N/A';
  return `$${(micros / 1000000).toFixed(2)}`;
};

// Helper functions for calculating changes
const calculateThreeMonthChange = (monthlyData?: KeywordResult['monthlySearchVolumes']): string => {
  if (!monthlyData || monthlyData.length < 4) return 'N/A';
  
  // Data is sorted chronologically (oldest to newest), so we need to get the last month vs 3 months ago
  const totalMonths = monthlyData.length;
  const lastMonth = monthlyData[totalMonths - 1]; // Most recent month
  const threeMonthsAgo = monthlyData[totalMonths - 4]; // 3 months ago
  
  if (!lastMonth || !threeMonthsAgo) return 'N/A';
  
  const lastMonthSearches = lastMonth.monthlySearches;
  const threeMonthsAgoSearches = threeMonthsAgo.monthlySearches;
  
  // Debug logging for verification
  if (process.env.NODE_ENV === 'development') {
    console.log('3-month change calculation:', {
      lastMonth: { month: lastMonth.monthLabel, searches: lastMonthSearches },
      threeMonthsAgo: { month: threeMonthsAgo.monthLabel, searches: threeMonthsAgoSearches },
      change: threeMonthsAgoSearches === 0 ? (lastMonthSearches > 0 ? '+∞%' : '0%') : ((lastMonthSearches - threeMonthsAgoSearches) / threeMonthsAgoSearches) * 100
    });
  }
  
  if (threeMonthsAgoSearches === 0) return lastMonthSearches > 0 ? '+∞%' : '0%';
  
  const change = ((lastMonthSearches - threeMonthsAgoSearches) / threeMonthsAgoSearches) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};


// LocalStorage utility functions for saving/loading search data
const STORAGE_KEY = 'last-keyword-search';

interface SavedSearchData {
  keywords: string;
  results: KeywordResult[];
  countryCode: string;
  languageCode: string;
  dataSource: string | null;
  timestamp: number;
}

const saveSearchData = (data: Omit<SavedSearchData, 'timestamp'>) => {
  try {
    const dataWithTimestamp = { ...data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.warn('Failed to save search data to localStorage:', error);
  }
};

const loadSearchData = (): SavedSearchData | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as SavedSearchData;
      // Only load data if it's less than 24 hours old
      const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
      return isRecent ? data : null;
    }
  } catch (error) {
    console.warn('Failed to load search data from localStorage:', error);
  }
  return null;
};

interface KeywordResult {
  keyword: string;
  searchVolume: number | string;
  competition: string;
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  monthlySearchVolumes?: Array<{
    month: string;
    year: number;
    monthIndex: number;
    monthLabel: string;
    dateKey: string;
    monthlySearches: number;
  }>;
  _meta?: {
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback' | 'openai_generated';
    reason?: string;
    cached?: boolean;
    generatedViaAI?: boolean;
  };
}

type MonthlyTrendPoint = NonNullable<KeywordResult['monthlySearchVolumes']>[number];

const MonthlyTrendChart: React.FC<{ keyword: string; trend: MonthlyTrendPoint[] }> = ({ keyword, trend }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const lastTwelve = trend.slice(-12);
  const maxVolume = Math.max(...lastTwelve.map((point) => point.monthlySearches));
  const minVolume = Math.min(...lastTwelve.map((point) => point.monthlySearches));
  const chartRange = maxVolume - minVolume;
  const chartHeight = 40;
  const yAxisWidth = 45; // Width for y-axis label
  
  // Padding to prevent clipping
  const paddingTop = 5;
  const paddingBottom = 5;
  const innerRange = 100 - paddingTop - paddingBottom;

  // Format max volume for display (abbreviate large numbers)
  const formatTopNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="relative" style={{ paddingRight: `${yAxisWidth}px` }}>
      {hoveredIndex !== null && lastTwelve[hoveredIndex] && (
        <div className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full pointer-events-none">
          <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {lastTwelve[hoveredIndex].monthLabel}: {lastTwelve[hoveredIndex].monthlySearches.toLocaleString()}
          </div>
        </div>
      )}
      
      {/* Y-axis label (top number) - on the right */}
      <div className="absolute right-0 top-0 text-xs text-gray-500 font-medium" style={{ width: `${yAxisWidth - 4}px`, textAlign: 'left', paddingLeft: '4px' }}>
        {formatTopNumber(maxVolume)}
      </div>
      
      {/* Chart SVG */}
      <svg
        className="w-full"
        height={chartHeight}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {lastTwelve.length > 1 && (
          <>
            {/* Simple line */}
            <path
              d={lastTwelve.map((point, idx) => {
                const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
                const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
                const y = paddingTop + (1 - normalized) * innerRange;
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="rgb(99,102,241)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Minimal data points */}
            {lastTwelve.map((point, idx) => {
              const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
              const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
              const y = paddingTop + (1 - normalized) * innerRange;
              const isHovered = hoveredIndex === idx;
              
              return (
                <g
                  key={point.dateKey}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className="cursor-pointer"
                >
                  <circle cx={x} cy={y} r="6" fill="transparent" />
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={isHovered ? "1.5" : "0.8"}
                    fill="rgb(99,102,241)"
                    className="transition-all"
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );
};

export default function FindKeywords(): JSX.Element {
  const router = useRouter();
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('US');
  const [languageCode, setLanguageCode] = useState('en'); // Always English since dropdown is hidden
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'google' | 'ai'>('google');
  const isInitialLoad = useRef(true);
  const hasLoadedSavedData = useRef(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [hasUsedAI, setHasUsedAI] = useState(false);

  const { openSignIn } = useClerk();

  const handleChangePage = (
    event: unknown,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Same field clicked - cycle through: asc -> desc -> null (cancel sort)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // Different field clicked - start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(0); // Reset to first page when sorting
  };

  const handleTabChange = (tab: 'google' | 'ai') => {
    setActiveTab(tab);
    // Mark AI as used if user switches to AI tab
    if (tab === 'ai' && !hasUsedAI) {
      localStorage.setItem('hasUsedAIKeywords', 'true');
      setHasUsedAI(true);
    }
  };

  const parsePercentage = (percentageStr: string): number => {
    if (percentageStr === 'N/A') return -Infinity;
    if (percentageStr === '+∞%') return Infinity;
    if (percentageStr === '0%') return 0;
    // Remove the % sign and parse as float (handles negative numbers automatically)
    return parseFloat(percentageStr.replace('%', ''));
  };

  const getSortedResults = () => {
    if (!sortField || !sortDirection) return results;

    return [...results].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'keyword':
          // String sorting
          const aKeyword = a.keyword.toLowerCase();
          const bKeyword = b.keyword.toLowerCase();
          if (aKeyword < bKeyword) return sortDirection === 'asc' ? -1 : 1;
          if (aKeyword > bKeyword) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        case 'volume':
          // Handle both number and string values
          aValue = typeof a.searchVolume === 'number'
            ? a.searchVolume
            : parseFloat(String(a.searchVolume)) || 0;
          bValue = typeof b.searchVolume === 'number'
            ? b.searchVolume
            : parseFloat(String(b.searchVolume)) || 0;
          break;
        case 'competition':
          // Use competitionIndex for proper numeric sorting
          aValue = Number(a.competitionIndex) || 0;
          bValue = Number(b.competitionIndex) || 0;
          break;
        case 'minCpc':
          aValue = a.lowTopPageBidMicros || 0;
          bValue = b.lowTopPageBidMicros || 0;
          break;
        case 'maxCpc':
          aValue = a.highTopPageBidMicros || 0;
          bValue = b.highTopPageBidMicros || 0;
          break;
        case 'threeMonthChange':
          aValue = parsePercentage(calculateThreeMonthChange(a.monthlySearchVolumes));
          bValue = parsePercentage(calculateThreeMonthChange(b.monthlySearchVolumes));
          break;
        default:
          return 0;
      }

      // Numeric sorting for all other cases
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Load saved search data on component mount
  useEffect(() => {
    const savedData = loadSearchData();
    if (savedData) {
      setKeywords(savedData.keywords);
      setResults(savedData.results);
      setCountryCode(savedData.countryCode);
      setLanguageCode('en'); // Always use English since dropdown is hidden
      setDataSource(savedData.dataSource);
      hasLoadedSavedData.current = true;
    }
    
    // Check if user has used AI feature before
    const used = localStorage.getItem('hasUsedAIKeywords');
    if (used === 'true') {
      setHasUsedAI(true);
    }
    
    isInitialLoad.current = false;
  }, []);

  // Save search data whenever it changes (but not on initial load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    // Reset the flag after initial load is complete
    if (hasLoadedSavedData.current) {
      hasLoadedSavedData.current = false;
    }
    
    if (keywords || results.length > 0) {
      saveSearchData({
        keywords,
        results,
        countryCode,
        languageCode,
        dataSource
      });
    }
  }, [keywords, results, countryCode, languageCode, dataSource]);

  // Clear results when country changes to force fresh search
  useEffect(() => {
    if (isInitialLoad.current || hasLoadedSavedData.current) return;
    
    // Clear results when country changes so user knows they need to search again
    if (results.length > 0) {
      setResults([]);
    }
  }, [countryCode]);

  const handleKeywordResearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const endpoint = activeTab === 'google' ? '/api/keyword-research' : '/api/keyword-research/ai';
      const payload = activeTab === 'google'
        ? { keywords, countryCode, languageCode, useCache: cacheEnabled, userPrompt: keywords }
        : { prompt: keywords, countryCode, languageCode, useCache: cacheEnabled };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during keyword research');
      }
      setResults(data);
      
      // Check data source from first result
      if (data.length > 0 && data[0]._meta) {
        setDataSource(data[0]._meta.dataSource);
        if (data[0]._meta.generatedViaAI) {
          toast.success('AI-generated ideas enriched with Google Ads metrics');
        } else if (data[0]._meta.dataSource === 'google_ads_api') {
          toast.success('Google Ads results ready');
        } else if (data[0]._meta.dataSource === 'mock_fallback') {
          toast.error('⚠️ Fallback data used - Google Ads API returned no results (unusual with Standard Access)');
        } else if (data[0]._meta.dataSource === 'openai_generated') {
          toast.success('AI-generated keyword ideas ready');
        } else {
          toast('📊 Using mock data - Enable GADS_USE_KEYWORD_PLANNING for real data', { icon: '⚠️' });
        }
      } else {
        toast.success('Keyword research completed!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during keyword research');
    }
    setLoading(false);
  };

  const renderMonthlyTrend = (keyword: string, trend?: KeywordResult['monthlySearchVolumes']) => {
    if (!trend || trend.length === 0) {
      return <span className="text-xs text-gray-400">No trend data</span>;
    }

    return <MonthlyTrendChart keyword={keyword} trend={trend} />;
  };

  // Get last month label from results to display in column header
  const getLastMonthLabel = (): string | null => {
    const firstResultWithTrend = results.find(r => r.monthlySearchVolumes && r.monthlySearchVolumes.length > 0);
    if (!firstResultWithTrend?.monthlySearchVolumes) return null;
    
    const lastPoint = firstResultWithTrend.monthlySearchVolumes[firstResultWithTrend.monthlySearchVolumes.length - 1];
    if (!lastPoint || !lastPoint.monthLabel) return null;
    
    // Extract just the month part (e.g., "Jan 2024" -> "Jan")
    return lastPoint.monthLabel.split(' ')[0];
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Find Keywords</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="absolute top-4 left-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>

        <h1 className="text-2xl text-gray-900 mb-1 tracking-tight">
          Keywords <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {'Planner'}
          </span>
        </h1>

        <SignedIn>
          {/* Main Input Area */}
          <div className="w-full max-w-3xl mx-auto">
            <div className="space-y-4">
              {/* Simplified Input Area */}
              <div className="relative bg-white rounded-lg border border-gray-200 focus-within:border-blue-500 transition-colors">
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent p-4 pb-16 text-gray-700 resize-none text-lg placeholder-gray-400 rounded-lg border-0 focus:outline-none focus:ring-0"
                  placeholder={activeTab === 'google' ? 'Enter keywords (one per line)' : 'Describe your product, audience, or topic to generate keyword ideas'}
                />
                
                {/* Simplified Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-lg p-3 border-t border-gray-100">
                  <div className="flex items-center space-x-3">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-white border border-gray-200 rounded px-3 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="WORLD">World</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="NL">Netherlands</option>
                      <option value="SE">Sweden</option>
                      <option value="NO">Norway</option>
                      <option value="DK">Denmark</option>
                      <option value="FI">Finland</option>
                    </select>

                    {/* Language dropdown hidden for now */}
                    {/* <select
                      value={languageCode}
                      onChange={(e) => setLanguageCode(e.target.value)}
                      className="bg-white border border-gray-200 rounded px-3 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="pt">Portuguese</option>
                      <option value="nl">Dutch</option>
                      <option value="sv">Swedish</option>
                      <option value="no">Norwegian</option>
                      <option value="da">Danish</option>
                      <option value="fi">Finnish</option>
                    </select> */}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Enhanced Tabs Component */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
                      <button
                        onClick={() => handleTabChange('google')}
                        className={`group relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                          activeTab === 'google' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Search for keywords using Google Ads data"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'google' ? 'scale-110' : 'group-hover:scale-105'}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Find Keywords</span>
                      </button>
                      <button
                        onClick={() => handleTabChange('ai')}
                        className={`group relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2 ${
                          activeTab === 'ai' 
                            ? 'bg-white text-purple-600 shadow-sm' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="Generate keyword ideas with AI"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-4 w-4 transition-transform duration-200 ${activeTab === 'ai' ? 'scale-110' : 'group-hover:scale-105'}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>AI Prompt</span>
                        {activeTab !== 'ai' && !hasUsedAI && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                          </span>
                        )}
                      </button>
                    </div>
                    
                    <button
                      onClick={handleKeywordResearch}
                      disabled={loading || !keywords.trim()}
                      className={`bg-black hover:bg-gray-800 text-white rounded-lg px-5 py-2.5 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95`}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>{activeTab === 'google' ? 'Searching...' : 'Generating...'}</span>
                        </>
                      ) : (
                        <>
                          {activeTab === 'google' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          <span className="font-medium">{activeTab === 'google' ? 'Search' : 'Generate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-8 w-full" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
              <div className="overflow-x-auto w-full px-4">
                <table className="w-full text-left table-fixed" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th 
                        className="font-medium p-3 text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '25%' }}
                        onClick={() => handleSort('keyword')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Keyword</span>
                          {sortField === 'keyword' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="font-medium p-3 text-right text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '10%' }}
                        onClick={() => handleSort('volume')}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Volume</span>
                          {sortField === 'volume' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="font-medium p-3 text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '12%' }}
                        onClick={() => handleSort('competition')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Competition</span>
                          {sortField === 'competition' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="font-medium p-3 text-right text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '10%' }}
                        onClick={() => handleSort('minCpc')}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Min CPC</span>
                          {sortField === 'minCpc' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="font-medium p-3 text-right text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '10%' }}
                        onClick={() => handleSort('maxCpc')}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>Max CPC</span>
                          {sortField === 'maxCpc' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="font-medium p-3 text-right text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
                        style={{ width: '12%' }}
                        onClick={() => handleSort('threeMonthChange')}
                      >
                        <div className="flex items-center justify-end space-x-1">
                          <span>3-mo Change</span>
                          {sortField === 'threeMonthChange' && sortDirection !== null && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="font-medium p-3 text-gray-700" style={{ width: '21%' }}>
                        {getLastMonthLabel() ? `Trend (${getLastMonthLabel()})` : 'Trend'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedResults()
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((result, index) => (
                      <tr key={`${result.keyword}-${index}`} className="border-b border-gray-100">
                        <td className="p-3 font-medium flex items-center space-x-2">
                          <span>{result.keyword}</span>
                          {result._meta?.dataSource === 'openai_generated' && (
                            <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                              AI
                            </span>
                          )}
                          {result._meta?.cached && (
                            <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                              Cached
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {typeof result.searchVolume === 'number' 
                            ? result.searchVolume.toLocaleString() 
                            : result.searchVolume}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.competition === 'LOW' ? 'bg-green-100 text-green-700' :
                              result.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              result.competition === 'HIGH' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {result.competition}
                            </span>
                            <span className="text-xs text-gray-500">
                              {result.competitionIndex !== undefined ? `(${result.competitionIndex})` : '(N/A)'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {result.lowTopPageBidMicros ? formatCpc(result.lowTopPageBidMicros) : 'N/A'}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          {result.highTopPageBidMicros ? formatCpc(result.highTopPageBidMicros) : 'N/A'}
                        </td>
                        <td className="p-3 text-right text-gray-600">
                          <span className={`text-sm font-medium ${
                            calculateThreeMonthChange(result.monthlySearchVolumes).startsWith('+') ? 'text-green-600' :
                            calculateThreeMonthChange(result.monthlySearchVolumes).startsWith('-') ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {calculateThreeMonthChange(result.monthlySearchVolumes)}
                          </span>
                        </td>
                        <td className="p-3 align-middle">
                          {renderMonthlyTrend(result.keyword, result.monthlySearchVolumes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={cacheEnabled}
                        onChange={(e) => setCacheEnabled(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={activeTab === 'ai'}
                      />
                      <span className={activeTab === 'ai' ? 'text-gray-400' : ''}>Use cache</span>
                    </label>
                    <div className="text-xs text-gray-500">
                      {activeTab === 'ai'
                        ? 'AI mode always fetches fresh ideas'
                        : cacheEnabled
                          ? '⚡ Faster responses, reduced API costs'
                          : '🔄 Fresh data, higher API costs'}
                    </div>
                    {results.length > 0 && (
                      <div className="text-xs text-blue-600">
                        {activeTab === 'ai'
                          ? '🤖 Generated by AI'
                          : results.some(r => r._meta?.cached)
                            ? `📦 ${results.filter(r => r._meta?.cached).length}/${results.length} cached`
                            : '🔄 All fresh data'}
                      </div>
                    )}
                  </div>
                  <TablePagination
                    rowsPerPageOptions={[25, 50, 100]}
                    component="div"
                    count={results.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </div>
              </div>
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <button onClick={() => openSignIn()} className="bg-black text-white rounded px-4 py-2 mt-8 hover:bg-gray-800 transition-colors">
            Sign in to use Keyword Finder
          </button>
        </SignedOut>
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}


