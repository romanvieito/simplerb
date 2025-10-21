import React, { useState, useEffect, useRef } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
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
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback';
    reason?: string;
  };
}

type MonthlyTrendPoint = NonNullable<KeywordResult['monthlySearchVolumes']>[number];

const MonthlyTrendChart: React.FC<{ keyword: string; trend: MonthlyTrendPoint[] }> = ({ keyword, trend }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const lastTwelve = trend.slice(-12);
  const maxVolume = Math.max(...lastTwelve.map((point) => point.monthlySearches));
  const minVolume = Math.min(...lastTwelve.map((point) => point.monthlySearches));
  const chartRange = maxVolume - minVolume;
  const chartHeight = 60;
  
  // Add padding to prevent chart from touching edges (in percentage)
  const paddingTop = 10;
  const paddingBottom = 10;
  const innerRange = 100 - paddingTop - paddingBottom;

  const sanitizedKeyword = keyword.replace(/[^a-z0-9]+/gi, '-') || 'keyword';
  const gradientId = `trendGradient-${sanitizedKeyword}-${lastTwelve[0]?.dateKey ?? 'start'}`;
  const glowId = `glow-${sanitizedKeyword}-${lastTwelve[0]?.dateKey ?? 'start'}`;

  // Calculate trend direction for visual cues
  const trendDirection = lastTwelve.length >= 2 
    ? lastTwelve[lastTwelve.length - 1].monthlySearches - lastTwelve[0].monthlySearches
    : 0;
  const isPositiveTrend = trendDirection > 0;
  const isNegativeTrend = trendDirection < 0;

  return (
    <div className="relative flex flex-col space-y-2 group">
      {hoveredIndex !== null && lastTwelve[hoveredIndex] && (
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 -translate-y-full pointer-events-none">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
            <div className="flex flex-col items-center space-y-0.5">
              <div className="text-xs font-semibold text-gray-900">{lastTwelve[hoveredIndex].monthLabel}</div>
              <div className="text-sm font-bold text-blue-600">{lastTwelve[hoveredIndex].monthlySearches.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">searches</div>
            </div>
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white" style={{ marginTop: '-1px' }}></div>
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        className="w-full transition-all duration-200 group-hover:drop-shadow-sm"
        height={chartHeight}
        role="img"
        aria-label={`Monthly search volume trend for ${keyword}`}
        onMouseLeave={() => setHoveredIndex(null)}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isPositiveTrend ? "rgba(34,197,94,0.25)" : isNegativeTrend ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"} />
            <stop offset="100%" stopColor={isPositiveTrend ? "rgba(34,197,94,0.02)" : isNegativeTrend ? "rgba(239,68,68,0.02)" : "rgba(59,130,246,0.02)"} />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background with subtle gradient */}
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill="url(#bgGradient)"
          className="fill-gray-50/50"
          rx="4"
        />
        
        {lastTwelve.length > 1 && (
          <>
            {/* Area fill */}
            <path
              d={`${lastTwelve.map((point, idx) => {
                const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
                const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
                const y = paddingTop + (1 - normalized) * innerRange;
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')} L 100 ${100 - paddingBottom} L 0 ${100 - paddingBottom} Z`}
              fill={`url(#${gradientId})`}
              opacity="0.8"
            />
            
            {/* Main trend line */}
            <path
              d={lastTwelve.map((point, idx) => {
                const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
                const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
                const y = paddingTop + (1 - normalized) * innerRange;
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={isPositiveTrend ? "rgb(34,197,94)" : isNegativeTrend ? "rgb(239,68,68)" : "rgb(59,130,246)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${glowId})`}
              className="transition-all duration-200"
            />
            
            {/* Data points */}
            {lastTwelve.map((point, idx) => {
              const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
              const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
              const y = paddingTop + (1 - normalized) * innerRange;
              const isHovered = hoveredIndex === idx;
              
              return (
                <g
                  key={point.dateKey}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onFocus={() => setHoveredIndex(idx)}
                  onBlur={() => setHoveredIndex((prev) => (prev === idx ? null : prev))}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer outline-none"
                >
                  {/* Hover target (invisible but larger) */}
                  <circle cx={x} cy={y} r="5" fill="transparent" />
                  
                  {/* Outer ring on hover */}
                  {isHovered && (
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="2.5" 
                      fill="none"
                      stroke={isPositiveTrend ? "rgb(34,197,94)" : isNegativeTrend ? "rgb(239,68,68)" : "rgb(59,130,246)"}
                      strokeWidth="0.5"
                      opacity="0.3"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Data point dot */}
                  <circle 
                    cx={x} 
                    cy={y} 
                    r={isHovered ? "1.5" : "1.2"}
                    fill="white"
                    stroke={isPositiveTrend ? "rgb(34,197,94)" : isNegativeTrend ? "rgb(239,68,68)" : "rgb(59,130,246)"}
                    strokeWidth={isHovered ? "0.8" : "0.6"}
                    className="transition-all duration-150"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                  />
                </g>
              );
            })}
          </>
        )}
      </svg>
      
      {/* Enhanced date labels */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 px-1">
        <span className="font-medium">{lastTwelve[0]?.monthLabel}</span>
        {lastTwelve.length >= 2 && (
          <div className={`flex items-center space-x-1 text-[9px] font-semibold ${
            isPositiveTrend ? 'text-green-600' : isNegativeTrend ? 'text-red-600' : 'text-gray-500'
          }`}>
            {isPositiveTrend && <span>↗</span>}
            {isNegativeTrend && <span>↘</span>}
            {!isPositiveTrend && !isNegativeTrend && <span>→</span>}
          </div>
        )}
        <span className="font-medium">{lastTwelve[lastTwelve.length - 1]?.monthLabel}</span>
      </div>
    </div>
  );
};

export default function FindKeywords(): JSX.Element {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('US');
  const [languageCode, setLanguageCode] = useState('en'); // Always English since dropdown is hidden
  const [dataSource, setDataSource] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const hasLoadedSavedData = useRef(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

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
      
      // Show a subtle notification that saved data was restored (only once)
      if (savedData.results.length > 0) {
        toast('Previous search restored', { 
          duration: 2000,
          icon: '💾'
        });
      }
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
      const response = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, countryCode, languageCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during keyword research');
      }
      setResults(data);
      
      // Check data source from first result
      if (data.length > 0 && data[0]._meta) {
        setDataSource(data[0]._meta.dataSource);
        if (data[0]._meta.dataSource === 'google_ads_api') {
          toast.success('');
        } else if (data[0]._meta.dataSource === 'mock_fallback') {
          toast.error('⚠️ Fallback data used - Google Ads API returned no results (unusual with Standard Access)');
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

  return (
    <div className="w-full px-4 py-8 min-h-screen">
      <Head>
        <title>Find Keywords</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center text-center">
        <h1 className="text-2xl font-medium text-slate-900 mb-8">
          Find Keywords
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
                  placeholder="Enter keywords (one per line)"
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
                  
                  <button
                    onClick={handleKeywordResearch}
                    disabled={loading || !keywords.trim()}
                    className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612l-3.96 4.158a.75.75 0 11-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158v10.638A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                        <span>Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-8 w-full">
              {dataSource && dataSource !== 'google_ads_api' && results[0]._meta?.reason && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  {results[0]._meta.reason}
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th 
                        className="font-medium p-3 text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
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
                      <th className="font-medium p-3 text-gray-700 min-w-[200px]">12-mo Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedResults()
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((result, index) => (
                      <tr key={`${result.keyword}-${index}`} className="border-b border-gray-100">
                        <td className="p-3 font-medium">{result.keyword}</td>
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
                        <td className="p-4 align-middle">
                          {renderMonthlyTrend(result.keyword, result.monthlySearchVolumes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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


