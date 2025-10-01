
import React, { useState } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";

interface KeywordResult {
  keyword: string;
  searchVolume: number;
  competition: string;
}

const AdsPage = () => {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { openSignIn } = useClerk();

  const handleKeywordResearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const response = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during keyword research');
      }
      setResults(data);
      toast.success('Keyword research completed!');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during keyword research');
    }
    setLoading(false);
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Keyword Research Tool</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Keyword Research Tool
        </h1>
        <p className="text-slate-500 mt-5">Generate keyword ideas and get search volume data.</p>

        <SignedIn>
          <div className="max-w-xl w-full">
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
              placeholder="Enter keywords (one per line)"
            />
            <button
              onClick={handleKeywordResearch}
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              disabled={loading}
            >
              {loading ? 'Researching...' : 'Research Keywords'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">Results</h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="border-b font-medium p-4 pl-8 pt-0 pb-3">Keyword</th>
                    <th className="border-b font-medium p-4 pl-8 pt-0 pb-3">Search Volume</th>
                    <th className="border-b font-medium p-4 pl-8 pt-0 pb-3">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td className="border-b border-slate-100 p-4 pl-8">{result.keyword}</td>
                      <td className="border-b border-slate-100 p-4 pl-8">{result.searchVolume}</td>
                      <td className="border-b border-slate-100 p-4 pl-8">{result.competition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <button onClick={() => openSignIn()} className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80">
            Sign in to use the Keyword Research Tool
          </button>
        </SignedOut>
      </main>

      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
};

export default AdsPage;