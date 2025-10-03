import { useState, useEffect, useContext } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import SBRContext from '../context/SBRContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface Site {
  id: string;
  subdomain: string;
  description: string;
  created_at: string;
  updated_at: string;
  url: string;
}

const SitesPage = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser } = context;

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch user sites
  const fetchSites = async () => {
    if (!dataUser?.id) return;

    try {
      const response = await fetch('/api/get-user-sites', {
        headers: {
          'Authorization': `Bearer ${dataUser.id}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load your sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn && dataUser?.id) {
      fetchSites();
    }
  }, [isSignedIn, dataUser?.id]);

  // Delete site
  const deleteSite = async (siteId: string, subdomain: string) => {
    if (!confirm(`Are you sure you want to delete ${subdomain}.simplerb.com? This action cannot be undone.`)) {
      return;
    }

    setDeletingSite(siteId);
    try {
      const response = await fetch(`/api/delete-site?siteId=${siteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${dataUser?.id}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete site');
      }

      toast.success('Site deleted successfully');
      setSites(sites.filter(site => site.id !== siteId));
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error('Failed to delete site');
    } finally {
      setDeletingSite(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>My Sites - SimplerB</title>
        <meta name="description" content="Manage your published websites" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header credits={0} />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Sites</h1>
                <p className="text-gray-600 mt-2">Manage your published websites</p>
              </div>
              <Link 
                href="/web"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New Site</span>
              </Link>
            </div>

            {/* Sites Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your sites...</p>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sites yet</h3>
                <p className="text-gray-600 mb-6">Create your first website to get started</p>
                <Link 
                  href="/web"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Your First Site</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((site) => (
                  <div key={site.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Site Preview */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-500">Website Preview</p>
                      </div>
                    </div>

                    {/* Site Info */}
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2 truncate">
                        {site.description || 'Untitled Site'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {site.subdomain}.simplerb.com
                      </p>
                      
                      <div className="text-xs text-gray-500 mb-4">
                        <p>Created: {formatDate(site.created_at)}</p>
                        {site.updated_at !== site.created_at && (
                          <p>Updated: {formatDate(site.updated_at)}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-3">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          View Site
                        </a>
                        <Link
                          href={`/web?edit=${site.subdomain}`}
                          className="flex-1 bg-gray-100 text-gray-700 text-center px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteSite(site.id, site.subdomain)}
                          disabled={deletingSite === site.id}
                          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingSite === site.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SitesPage;
