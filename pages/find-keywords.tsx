import React, { useState } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";

const formatCpc = (micros?: number): string => {
  if (!micros) return 'N/A';
  return `$${(micros / 1000000).toFixed(2)}`;
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
    year: string;
    monthlySearches: number;
  }>;
  _meta?: {
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback';
    reason?: string;
  };
}

export default function FindKeywords(): JSX.Element {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('US');
  const [languageCode, setLanguageCode] = useState('en');
  const [dataSource, setDataSource] = useState<string | null>(null);

  const { openSignIn } = useClerk();

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
          toast.success('✅ Enjoy!');
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

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Find Keywords</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="text-xl max-w-[708px] font-bold text-slate-900">
          Find Keywords
        </h1>

        <SignedIn>
          {/* Main Input Area */}
          <div className="w-full max-w-4xl mx-auto mt-8">
            <div className="space-y-6">
              {/* Integrated Input Area with Action Bar */}
              <div className="relative bg-white rounded-2xl border-2 border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-blue-500 transition-all duration-300">
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent p-6 pb-20 text-gray-700 resize-none transition-all duration-300 text-lg placeholder-gray-400 rounded-2xl border-0 focus:outline-none focus:ring-0"
                  placeholder="Enter keywords (one per line)"
                />
                
                {/* Integrated Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-2xl p-4 border-t border-gray-100 overflow-visible">
                  <div className="flex items-center space-x-3 overflow-visible">
                    {/* Country Dropdown */}
                    <div className="relative overflow-visible">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-sm appearance-none pr-8"
                      >
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
                    </div>

                    {/* Language Dropdown */}
                    <div className="relative overflow-visible">
                      <select
                        value={languageCode}
                        onChange={(e) => setLanguageCode(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-sm appearance-none pr-8"
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
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleKeywordResearch}
                      disabled={loading || !keywords.trim()}
                      className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Researching...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612l-3.96 4.158a.75.75 0 11-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158v10.638A.75.75 0 0110 17z" clipRule="evenodd" />
                          </svg>
                          <span>Go</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-10 w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Results</h2>
                {dataSource && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    dataSource === 'google_ads_api' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {dataSource === 'google_ads_api' ? '' : '⚠️ Mock Data'}
                  </div>
                )}
              </div>
              {dataSource && dataSource !== 'google_ads_api' && results[0]._meta?.reason && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> {results[0]._meta.reason}
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b font-medium p-4 pl-8 pt-0 pb-3">Keyword</th>
                      <th className="border-b font-medium p-4 pt-0 pb-3 text-right">Search Volume</th>
                      <th className="border-b font-medium p-4 pt-0 pb-3">Competition</th>
                      <th className="border-b font-medium p-4 pt-0 pb-3 text-right">Comp. Index</th>
                      <th className="border-b font-medium p-4 pt-0 pb-3 text-right">Avg CPC</th>
                      <th className="border-b font-medium p-4 pr-8 pt-0 pb-3 text-right">CPC Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={`${result.keyword}-${index}`}>
                        <td className="border-b border-slate-100 p-4 pl-8">{result.keyword}</td>
                        <td className="border-b border-slate-100 p-4 text-right">
                          {typeof result.searchVolume === 'number' 
                            ? result.searchVolume.toLocaleString() 
                            : result.searchVolume}
                        </td>
                        <td className="border-b border-slate-100 p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            result.competition === 'LOW' ? 'bg-green-100 text-green-800' :
                            result.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            result.competition === 'HIGH' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.competition}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 p-4 text-right">
                          {result.competitionIndex !== undefined ? result.competitionIndex : 'N/A'}
                        </td>
                        <td className="border-b border-slate-100 p-4 text-right">
                          {formatCpc(result.avgCpcMicros)}
                        </td>
                        <td className="border-b border-slate-100 p-4 pr-8 text-right text-sm text-gray-600">
                          {result.lowTopPageBidMicros && result.highTopPageBidMicros
                            ? `${formatCpc(result.lowTopPageBidMicros)} - ${formatCpc(result.highTopPageBidMicros)}`
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <button onClick={() => openSignIn()} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80">
            Sign in to use the Keyword Finder
          </button>
        </SignedOut>
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
}


