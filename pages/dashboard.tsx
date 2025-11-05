import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Container, Grid } from '@mui/material';
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">
            {!isLoaded ? 'Loading...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Dashboard - SimplerB</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header credits={0} />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-black/95 z-0"></div>
        <Container maxWidth="lg" className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-bold mb-8 tracking-tight">
              Your Dashboard
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Manage your keyword favorites and access all your tools in one place.
            </p>
          </div>
        </Container>
      </section>

      {/* Dashboard Sections */}
      <section className="py-32 bg-black">
        <Container maxWidth="lg">
          <Grid container spacing={8}>

            {/* Keyword Favorites Section */}
            <Grid item xs={12} md={6}>
              <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-6">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                    Keyword Favorites
                  </span>
                </h2>
                <p className="text-gray-400 mb-6">
                  Your saved keywords for research and optimization.
                </p>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-400">Loading favorites...</p>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No keyword favorites yet.</p>
                    <a
                      href="/find-keywords"
                      className="inline-block mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                    >
                      Find Keywords
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 text-gray-300 font-medium">Keyword</th>
                          <th className="text-left py-3 text-gray-300 font-medium">Volume</th>
                          <th className="text-left py-3 text-gray-300 font-medium">Competition</th>
                          <th className="text-left py-3 text-gray-300 font-medium">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {favorites.slice(0, 10).map((favorite, index) => (
                          <tr key={index} className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors">
                            <td className="py-3 text-white font-medium">{favorite.keyword}</td>
                            <td className="py-3 text-gray-300">{favorite.search_volume || 'N/A'}</td>
                            <td className="py-3 text-gray-300">{favorite.competition || 'N/A'}</td>
                            <td className="py-3 text-gray-300">{formatCPC(favorite.avg_cpc_micros)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {favorites.length > 10 && (
                      <p className="text-sm text-gray-500 mt-4">
                        Showing {Math.min(10, favorites.length)} of {favorites.length} favorites
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Grid>

            {/* Domain Generator Section - Placeholder */}
            <Grid item xs={12} md={6}>
              <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-6">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                    Domain Generator
                  </span>
                </h2>
                <p className="text-gray-400 mb-6">
                  Find the perfect domain name for your next project.
                </p>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Coming soon...</p>
                  <a
                    href="/domain"
                    className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                  >
                    Try Domain Generator
                  </a>
                </div>
              </div>
            </Grid>

            {/* Website Builder Section - Placeholder */}
            <Grid item xs={12} md={6}>
              <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-6">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                    Website Builder
                  </span>
                </h2>
                <p className="text-gray-400 mb-6">
                  Create beautiful websites quickly and easily.
                </p>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Coming soon...</p>
                  <a
                    href="/web"
                    className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                  >
                    Try Website Builder
                  </a>
                </div>
              </div>
            </Grid>

            {/* Ads Generator Section - Placeholder */}
            <Grid item xs={12} md={6}>
              <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8">
                <h2 className="text-3xl font-bold mb-6">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">
                    Ads Generator
                  </span>
                </h2>
                <p className="text-gray-400 mb-6">
                  Generate high-converting ads for your campaigns.
                </p>
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Coming soon...</p>
                  <a
                    href="/ads"
                    className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
                  >
                    Try Ads Generator
                  </a>
                </div>
              </div>
            </Grid>

          </Grid>
        </Container>
      </section>

      <Footer />
    </div>
  );
};

export default Dashboard;
