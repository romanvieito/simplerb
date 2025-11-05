import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';

interface KeywordFavorite {
  keyword: string;
  country_code: string | null;
  language_code: string | null;
  search_volume: number | null;
  competition: string | null;
  competition_index: number | null;
  avg_cpc_micros: bigint | null;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [favorites, setFavorites] = useState<KeywordFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Fetch keyword favorites
  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/keyword-favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      } else {
        console.error('Failed to fetch favorites');
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  // Format currency from micros
  const formatCPC = (micros: bigint | null) => {
    if (!micros) return 'N/A';
    const dollars = Number(micros) / 1_000_000;
    return `$${dollars.toFixed(2)}`;
  };

  if (!isLoaded || !user) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-2 min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!isLoaded ? 'Loading...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center py-2 min-h-screen bg-white">
      <Head>
        <title>Dashboard - SimplerB</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-2 sm:mt-2">
        {/* Header */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 text-xl font-light hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
          >
            ‹
          </button>
          <span className="text-gray-900 font-medium">Dashboard</span>
        </div>

            {/* Keyword Favorites Section */}
          <div id="favorites" className="w-full max-w-6xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Keyword Favorites</h2>
                  <a
                    href="/find-keywords"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Find Keywords
                  </a>
                </div>
                <p className="text-sm text-gray-600 mt-1">Your saved keywords for research and optimization</p>
              </div>

              {/* Content */}
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading favorites...</p>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No keyword favorites yet</h3>
                    <p className="text-gray-600 mb-6">Start by searching for keywords to save your favorites for later.</p>
                    <a
                      href="/find-keywords"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Find Keywords
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Keyword</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Volume</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Competition</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">CPC</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Country</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {favorites.map((favorite, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{favorite.keyword}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.search_volume?.toLocaleString() || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.competition || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{formatCPC(favorite.avg_cpc_micros)}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.country_code || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {new Date(favorite.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>


            {/* Feature Cards */}
            <div className="w-full max-w-4xl mx-auto mt-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a
                  href="/domain"
                  className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Domain Generator</h3>
                      <p className="text-gray-600 text-sm mb-3">Find the perfect domain name for your next project with AI-powered suggestions.</p>
                      <span className="text-sm text-green-600 font-medium">Try it now →</span>
                    </div>
                  </div>
                </a>

                <a
                  href="/web"
                  className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-purple-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Website Builder</h3>
                      <p className="text-gray-600 text-sm mb-3">Create beautiful websites quickly and easily with our drag-and-drop builder.</p>
                      <span className="text-sm text-purple-600 font-medium">Try it now →</span>
                    </div>
                  </div>
                </a>

                <a
                  href="/ads"
                  className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-orange-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Ads Generator</h3>
                      <p className="text-gray-600 text-sm mb-3">Generate high-converting ads for your campaigns with AI assistance.</p>
                      <span className="text-sm text-orange-600 font-medium">Try it now →</span>
                    </div>
                  </div>
                </a>

                <div className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">More Coming Soon</h3>
                      <p className="text-gray-600 text-sm">We're building more powerful tools to help you grow your business.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            
      </main>
    </div>
  );
};

export default Dashboard;
