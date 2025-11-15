import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';

interface DashboardSection {
  id: string;
  title: string;
  component: React.ReactNode;
}

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

interface DomainFavorite {
  namedomain: string;
  available: boolean | null;
  favorite: boolean;
  rate: number | null;
  created_at: string | null;
}

interface PublishedSite {
  id: string;
  subdomain: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  screenshot: string | null;
  favorite: boolean;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user: realUser, isLoaded } = useUser();
  const [user, setUser] = useState<any>(null);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<KeywordFavorite[]>([]);
  const [domainFavorites, setDomainFavorites] = useState<DomainFavorite[]>([]);
  const [publishedSites, setPublishedSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [renamingSubdomain, setRenamingSubdomain] = useState<string | null>(null);
  const [newSubdomain, setNewSubdomain] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Section ordering state
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'favorites',
    'domain-favorites',
    'published-sites',
    'feature-cards'
  ]);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Section minimization state
  const [minimizedSections, setMinimizedSections] = useState<Set<string>>(new Set());


  // Set user state based on environment and auth status
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      if (realUser) {
        setUser(realUser);
      }
    } else {
      // Development: use mock user
      setUser({ id: 'test-user-dashboard' });
    }
  }, [realUser]);

  // In development, set mock user immediately on mount
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setUser({ id: 'test-user-dashboard' });
      // In development, use a mock internal user ID
      setInternalUserId('test-user-dashboard');
    }
  }, []);

  // Fetch internal user ID from database using Clerk user email
  useEffect(() => {
    const fetchInternalUserId = async () => {
      if (process.env.NODE_ENV === 'production' && realUser && isLoaded) {
        try {
          const email = realUser.emailAddresses[0]?.emailAddress;
          if (email) {
            const response = await fetch(`/api/getUser?email=${email}`);
            if (response.ok) {
              const userData = await response.json();
              if (userData.user && userData.user.id) {
                setInternalUserId(userData.user.id);
              } else {
                setDomainLoading(false);
              }
            } else {
              setDomainLoading(false);
            }
          } else {
            setDomainLoading(false);
          }
        } catch (error) {
          console.error('Error fetching internal user ID:', error);
          setDomainLoading(false);
        }
      }
    };

    fetchInternalUserId();
  }, [realUser, isLoaded]);

  // Redirect if not authenticated (skip in development with mock user)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && isLoaded && !realUser) {
      router.push('/sign-in');
    }
  }, [isLoaded, realUser, router]);

  // Load section order and minimized sections from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('dashboard-section-order');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Validate that all required sections are present
        const defaultOrder = ['favorites', 'domain-favorites', 'published-sites', 'feature-cards'];
        const validOrder = parsedOrder.filter((id: string) => defaultOrder.includes(id));
        // Add any missing sections
        defaultOrder.forEach(id => {
          if (!validOrder.includes(id)) {
            validOrder.push(id);
          }
        });
        setSectionOrder(validOrder.length > 0 ? validOrder : defaultOrder);
      } catch (error) {
        console.error('Error parsing saved section order:', error);
        // Reset to default order on error
        setSectionOrder(['favorites', 'domain-favorites', 'published-sites', 'feature-cards']);
      }
    }

    const savedMinimized = localStorage.getItem('dashboard-minimized-sections');
    if (savedMinimized) {
      try {
        const parsedMinimized = JSON.parse(savedMinimized);
        setMinimizedSections(new Set(parsedMinimized));
      } catch (error) {
        console.error('Error parsing saved minimized sections:', error);
      }
    }
  }, []);

  // Save section order to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboard-section-order', JSON.stringify(sectionOrder));
  }, [sectionOrder]);

  // Save minimized sections to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('dashboard-minimized-sections', JSON.stringify(Array.from(minimizedSections)));
  }, [minimizedSections]);

  // Drag and drop handlers for section reordering
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropSectionId: string) => {
    e.preventDefault();
    if (!draggedSection || draggedSection === dropSectionId) return;

    const draggedIndex = sectionOrder.indexOf(draggedSection);
    const dropIndex = sectionOrder.indexOf(dropSectionId);

    const newOrder = [...sectionOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedSection);

    setSectionOrder(newOrder);
    setDraggedSection(null);
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
  };

  // Toggle minimize/maximize section
  const toggleMinimizeSection = (sectionId: string) => {
    setMinimizedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Fetch keyword favorites
  const fetchFavorites = async () => {
    if (!user || !user.id) return;

    try {
      const response = await fetch('/api/keyword-favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      } else {
        console.error('Failed to fetch favorites:', response.status, response.statusText);
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

  useEffect(() => {
    if (internalUserId) {
      fetchDomainFavorites();
    } else if (process.env.NODE_ENV !== 'production') {
      // In development, if we have mock user, set loading to false
      setDomainLoading(false);
    }
  }, [internalUserId]);

  // Fetch published sites when user is loaded (uses Clerk auth, not internalUserId)
  useEffect(() => {
    if (isLoaded && (realUser || process.env.NODE_ENV !== 'production')) {
      fetchPublishedSites();
    } else if (isLoaded && !realUser) {
      setSitesLoading(false);
    }
  }, [isLoaded, realUser]);

  // Fetch domain favorites
  const fetchDomainFavorites = async () => {
    if (!internalUserId) return;

    try {
      const response = await fetch('/api/user-domainfavorite', {
        method: 'POST', // Using POST to send user_id in body
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: internalUserId }),
      });
      if (response.ok) {
        const data = await response.json();
        setDomainFavorites(data.favorites || []);
      } else {
        console.error('Failed to fetch domain favorites:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching domain favorites:', error);
    } finally {
      setDomainLoading(false);
    }
  };

  // Fetch published sites
  const fetchPublishedSites = async () => {
    // No need to check internalUserId - Clerk auth is handled server-side
    console.log('Fetching published sites');

    try {
      const response = await fetch('/api/get-user-sites', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Published sites response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Published sites data:', data);
        // Ensure all sites have a favorite field (default to false if missing)
        const sitesWithFavorites = (data.sites || []).map((site: any) => ({
          ...site,
          favorite: site.favorite ?? false
        }));
        setPublishedSites(sitesWithFavorites);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch published sites:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error fetching published sites:', error);
    } finally {
      setSitesLoading(false);
    }
  };

  // Remove domain from favorites
  const removeDomainFavorite = async (namedomain: string) => {
    if (!internalUserId) {
      console.error('Internal user ID not available');
      return;
    }

    try {
      const response = await fetch('/api/user-domainfavorite', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          namedomain,
          user_id: internalUserId,
        }),
      });

      if (response.ok) {
        // Remove from local state
        setDomainFavorites(domainFavorites.filter(fav => fav.namedomain !== namedomain));
      } else {
        console.error('Failed to remove domain favorite');
      }
    } catch (error) {
      console.error('Error removing domain favorite:', error);
    }
  };

  // Format currency from micros
  const formatCPC = (micros: bigint | null) => {
    if (!micros) return 'N/A';
    const dollars = Number(micros) / 1_000_000;
    return `$${dollars.toFixed(2)}`;
  };

  // Remove keyword from favorites
  const removeFavorite = async (keyword: string) => {
    try {
      const response = await fetch('/api/keyword-favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
        }),
      });

      if (response.ok) {
        // Remove from local state
        setFavorites(favorites.filter(fav => fav.keyword !== keyword));
      } else {
        console.error('Failed to remove favorite');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Rename subdomain
  const renameSubdomain = async (originalSubdomain: string, newSubdomainValue: string) => {
    if (!newSubdomainValue || newSubdomainValue === originalSubdomain) {
      setRenamingSubdomain(null);
      setNewSubdomain('');
      setRenameError(null);
      return;
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(newSubdomainValue) || newSubdomainValue.length < 3 || newSubdomainValue.length > 50) {
      setRenameError('Invalid subdomain format. Use only lowercase letters, numbers, and hyphens (3-50 characters)');
      return;
    }

    setRenameError(null);

    try {
      const response = await fetch('/api/update-subdomain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalSubdomain,
          newSubdomain: newSubdomainValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setPublishedSites(publishedSites.map(site =>
          site.subdomain === originalSubdomain
            ? { ...site, subdomain: newSubdomainValue, url: data.url }
            : site
        ));
        setRenamingSubdomain(null);
        setNewSubdomain('');
      } else {
        const errorData = await response.json();
        setRenameError(errorData.message || 'Failed to rename subdomain');
      }
    } catch (error) {
      console.error('Error renaming subdomain:', error);
      setRenameError('An error occurred while renaming the subdomain');
    }
  };

  // Start renaming subdomain
  const startRenaming = (subdomain: string) => {
    setRenamingSubdomain(subdomain);
    setNewSubdomain(subdomain);
    setRenameError(null);
  };

  // Cancel renaming
  const cancelRenaming = () => {
    setRenamingSubdomain(null);
    setNewSubdomain('');
    setRenameError(null);
  };

  // Toggle site favorite status
  const toggleSiteFavorite = async (siteId: string, currentFavorite: boolean) => {
    try {
      const response = await fetch('/api/toggle-site-favorite', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          favorite: !currentFavorite,
        }),
      });

      if (response.ok) {
        // Update local state
        setPublishedSites(publishedSites.map(site =>
          site.id === siteId
            ? { ...site, favorite: !currentFavorite }
            : site
        ));
      } else {
        console.error('Failed to toggle site favorite');
      }
    } catch (error) {
      console.error('Error toggling site favorite:', error);
    }
  };

  // Delete published site
  const deleteSite = async (subdomain: string) => {
    if (!internalUserId) {
      console.error('Internal user ID not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${subdomain}.simplerb.com? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/delete-site', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain,
          user_id: internalUserId,
        }),
      });

      if (response.ok) {
        // Remove from local state
        setPublishedSites(publishedSites.filter(site => site.subdomain !== subdomain));
      } else {
        console.error('Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
    }
  };

  // Define dashboard sections
  const sections: Record<string, DashboardSection> = {
    'favorites': {
      id: 'favorites',
      title: 'Keyword Favorites',
      component: (
        <div
          id="favorites"
          className={`w-full max-w-6xl mx-auto mb-8 transition-all duration-200 ${
            draggedSection === 'favorites' ? 'opacity-50' : ''
          } ${minimizedSections.has('favorites') ? 'h-24 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'favorites')}
        >
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'favorites')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'favorites')}
                    onDragEnd={handleDragEnd}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Keyword Favorites</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMinimizeSection('favorites')}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title={minimizedSections.has('favorites') ? 'Maximize section' : 'Minimize section'}
                  >
                    {minimizedSections.has('favorites') ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => fetchFavorites()}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Refresh keyword data"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <a
                    href="/find-keywords"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Find Keywords
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your saved keywords for research and optimization</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('favorites') && (
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
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">★</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Keyword</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Volume</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Competition</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">CPC</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Country</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Added</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {favorites.map((favorite, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => removeFavorite(favorite.keyword)}
                                className="inline-flex items-center justify-center w-8 h-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                                title="Remove from favorites"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{favorite.keyword}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.search_volume?.toLocaleString() || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.competition || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{formatCPC(favorite.avg_cpc_micros)}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.country_code || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {new Date(favorite.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => removeFavorite(favorite.keyword)}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Remove from favorites"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    'domain-favorites': {
      id: 'domain-favorites',
      title: 'Domain Favorites',
      component: (
        <div
          id="domain-favorites"
          className={`w-full max-w-6xl mx-auto mb-8 transition-all duration-200 ${
            draggedSection === 'domain-favorites' ? 'opacity-50' : ''
          } ${minimizedSections.has('domain-favorites') ? 'h-24 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'domain-favorites')}
        >
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'domain-favorites')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'domain-favorites')}
                    onDragEnd={handleDragEnd}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Domain Favorites</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMinimizeSection('domain-favorites')}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title={minimizedSections.has('domain-favorites') ? 'Maximize section' : 'Minimize section'}
                  >
                    {minimizedSections.has('domain-favorites') ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  <a
                    href="/domain"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Generate Domains
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your saved favorite domain names</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('domain-favorites') && (
              <div className="p-6">
                {domainLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading domain favorites...</p>
                  </div>
                ) : domainFavorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No domain favorites yet</h3>
                    <p className="text-gray-600 mb-6">Start by generating domains and save your favorites for later.</p>
                    <a
                      href="/domain"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Generate Domains
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">★</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Domain Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Availability</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Rating</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Added</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {domainFavorites.map((favorite, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => removeDomainFavorite(favorite.namedomain)}
                                className="inline-flex items-center justify-center w-8 h-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                                title="Remove from favorites"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{favorite.namedomain || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                favorite.available === true
                                  ? 'bg-green-100 text-green-800'
                                  : favorite.available === false
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {favorite.available === true ? 'Available' : favorite.available === false ? 'Unavailable' : 'Unknown'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                {favorite.rate !== null && favorite.rate !== undefined ? (
                                  [...Array(5)].map((_, i) => {
                                    const rateValue = favorite.rate ?? 0;
                                    return (
                                      <svg
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < rateValue ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                        }`}
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                      </svg>
                                    );
                                  })
                                ) : (
                                  <span className="text-gray-400 text-xs">No rating</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {favorite.created_at ? new Date(favorite.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => removeDomainFavorite(favorite.namedomain)}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Remove from favorites"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    'published-sites': {
      id: 'published-sites',
      title: 'Published Websites',
      component: (
        <div
          id="published-sites"
          className={`w-full max-w-6xl mx-auto mb-8 transition-all duration-200 ${
            draggedSection === 'published-sites' ? 'opacity-50' : ''
          } ${minimizedSections.has('published-sites') ? 'h-24 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'published-sites')}
        >
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'published-sites')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'published-sites')}
                    onDragEnd={handleDragEnd}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Published Websites</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMinimizeSection('published-sites')}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title={minimizedSections.has('published-sites') ? 'Maximize section' : 'Minimize section'}
                  >
                    {minimizedSections.has('published-sites') ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  <a
                    href="/web"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Create Website
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your published websites and landing pages</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('published-sites') && (
              <div className="p-6">
                {sitesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading published sites...</p>
                  </div>
                ) : publishedSites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No published websites yet</h3>
                    <p className="text-gray-600 mb-6">Create and publish your first website to see it here.</p>
                    <a
                      href="/web"
                      className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Create Website
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {renameError && renamingSubdomain && (
                      <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{renameError}</p>
                      </div>
                    )}
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">★</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Subdomain</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {publishedSites.map((site) => (
                          <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => toggleSiteFavorite(site.id, site.favorite)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                  site.favorite
                                    ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                                title={site.favorite ? 'Remove from favorites' : 'Add to favorites'}
                              >
                                <svg className={`w-4 h-4 ${site.favorite ? 'fill-current' : ''}`} fill={site.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">
                              {renamingSubdomain === site.subdomain ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newSubdomain}
                                    onChange={(e) => {
                                      setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                      setRenameError(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        renameSubdomain(site.subdomain, newSubdomain);
                                      } else if (e.key === 'Escape') {
                                        cancelRenaming();
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    autoFocus
                                  />
                                  <span className="text-gray-500 text-sm">.simplerb.com</span>
                                </div>
                              ) : (
                                <span>{site.subdomain}.simplerb.com</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">{site.description || 'No description'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              {new Date(site.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-center space-x-2">
                              {renamingSubdomain === site.subdomain ? (
                                <>
                                  <button
                                    onClick={() => renameSubdomain(site.subdomain, newSubdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                                    title="Save"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={cancelRenaming}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                                    title="Cancel"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <a
                                    href={site.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                                    title="View live site"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                  <button
                                    onClick={() => startRenaming(site.subdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                                    title="Rename subdomain"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteSite(site.subdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Delete site"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    },
    'feature-cards': {
      id: 'feature-cards',
      title: 'Feature Cards',
      component: (
        <div
          id="feature-cards"
          className={`w-full max-w-4xl mx-auto transition-all duration-200 ${
            draggedSection === 'feature-cards' ? 'opacity-50' : ''
          } ${minimizedSections.has('feature-cards') ? 'h-16 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'feature-cards')}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="cursor-move text-gray-400 hover:text-gray-600"
              draggable
              onDragStart={(e) => handleDragStart(e, 'feature-cards')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'feature-cards')}
              onDragEnd={handleDragEnd}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            <button
              onClick={() => toggleMinimizeSection('feature-cards')}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors ml-auto"
              title={minimizedSections.has('feature-cards') ? 'Maximize section' : 'Minimize section'}
            >
              {minimizedSections.has('feature-cards') ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
          {/* Content - only show if not minimized */}
          {!minimizedSections.has('feature-cards') && (
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

            <a
              href="/find-keywords"
              className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keyword Research</h3>
                  <p className="text-gray-600 text-sm mb-3">Discover high-value keywords and analyze search trends to optimize your content.</p>
                  <span className="text-sm text-blue-600 font-medium">Try it now →</span>
                </div>
              </div>
            </a>
            </div>
          )}
        </div>
      )
    }
  };

  if (process.env.NODE_ENV === 'production' && (!isLoaded || !realUser)) {
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

  // Ensure all required sections exist in the sections object
  const validSectionOrder = sectionOrder.filter(id => sections[id]);
  // Add any missing sections from the default order
  const defaultOrder = ['favorites', 'domain-favorites', 'published-sites', 'feature-cards'];
  defaultOrder.forEach(id => {
    if (!validSectionOrder.includes(id) && sections[id]) {
      validSectionOrder.push(id);
    }
  });

  return (
    <DashboardLayout title="Dashboard">
      {validSectionOrder.map((sectionId) => {
        const section = sections[sectionId];
        if (!section) {
          console.warn(`Section ${sectionId} not found in sections object`);
          return null;
        }
        return (
          <div key={sectionId}>
            {section.component}
          </div>
        );
      })}
    </DashboardLayout>
  );
};

export default Dashboard;
