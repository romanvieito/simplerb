import React, { useState, useEffect, useRef } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { TablePagination } from "@mui/material";

const formatCpc = (micros?: number): string => {
  if (!micros) return 'N/A';
  return `$${(micros / 1000000).toFixed(2)}`;
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

  const lastTwelve = trend.slice(-12);
  const maxVolume = Math.max(...lastTwelve.map((point) => point.monthlySearches));
  const minVolume = Math.min(...lastTwelve.map((point) => point.monthlySearches));
  const chartRange = maxVolume - minVolume;
  const chartWidth = 140;
  const chartHeight = 48;
  const paddingX = 10;
  const paddingY = 8;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;
  const step = lastTwelve.length > 1 ? innerWidth / (lastTwelve.length - 1) : 0;

  const getPoint = (value: number, index: number) => {
    const normalized = chartRange === 0 ? 0.5 : (value - minVolume) / chartRange;
    const x = lastTwelve.length > 1 ? paddingX + step * index : chartWidth / 2;
    const y = paddingY + (1 - normalized) * innerHeight;
    return { x, y };
  };

  const coordinates = lastTwelve.map((point, idx) => ({ ...getPoint(point.monthlySearches, idx), point }));
  const linePath = coordinates
    .map(({ x, y }, idx) => `${idx === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');
  const areaPath = coordinates.length > 1
    ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${chartHeight - paddingY} L ${coordinates[0].x} ${chartHeight - paddingY} Z`
    : '';
  const sanitizedKeyword = keyword.replace(/[^a-z0-9]+/gi, '-') || 'keyword';
  const gradientId = `trendGradient-${sanitizedKeyword}-${lastTwelve[0]?.dateKey ?? 'start'}`;
  const hoveredPoint = hoveredIndex !== null ? coordinates[hoveredIndex]?.point : null;

  return (
    <div className="relative flex flex-col space-y-1">
      {hoveredPoint && (
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] shadow-sm">
          <div className="font-medium text-gray-700">{hoveredPoint.monthLabel}</div>
          <div className="text-gray-500">{hoveredPoint.monthlySearches.toLocaleString()} searches</div>
        </div>
      )}
      <svg
        className="w-full max-w-[150px]"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={`Monthly search volume trend for ${keyword}`}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.05)" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={chartWidth}
          height={chartHeight}
          fill="rgba(59,130,246,0.04)"
          rx={6}
        />
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="rgb(59,130,246)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {coordinates.map(({ x, y, point }, idx) => (
          <g
            key={point.dateKey}
            onMouseEnter={() => setHoveredIndex(idx)}
            onFocus={() => setHoveredIndex(idx)}
            onBlur={() => setHoveredIndex((prev) => (prev === idx ? null : prev))}
            tabIndex={0}
            role="presentation"
          >
            <circle cx={x} cy={y} r={3} fill="rgb(59,130,246)" />
            <circle cx={x} cy={y} r={9} fill="transparent" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{lastTwelve[0]?.monthLabel}</span>
        <span>{lastTwelve[lastTwelve.length - 1]?.monthLabel}</span>
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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

  // Load saved search data on component mount
  useEffect(() => {
    const savedData = loadSearchData();
    if (savedData) {
      setKeywords(savedData.keywords);
      setResults(savedData.results);
      setCountryCode(savedData.countryCode);
      setLanguageCode('en'); // Always use English since dropdown is hidden
      setDataSource(savedData.dataSource);
      
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
    if (isInitialLoad.current) return;
    
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
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
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
            <div className="mt-8 w-full max-w-4xl mx-auto">
              {dataSource && dataSource !== 'google_ads_api' && results[0]._meta?.reason && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  {results[0]._meta.reason}
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="font-medium p-3 text-gray-700">Keyword</th>
                      <th className="font-medium p-3 text-right text-gray-700">Volume</th>
                      <th className="font-medium p-3 text-gray-700">Competition</th>
                      <th className="font-medium p-3 text-right text-gray-700">Min CPC</th>
                      <th className="font-medium p-3 text-right text-gray-700">Max CPC</th>
                      <th className="font-medium p-3 text-gray-700">12-mo Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results
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
                        <td className="p-3 align-top">
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


