import { useState, useEffect, useContext } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { useClerk, UserButton } from '@clerk/nextjs';
import { Button, Box, TablePagination } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import SBRContext from '../context/SBRContext';

interface Site {
  id: string;
  subdomain: string;
  description: string;
  created_at: string;
  updated_at: string;
  url: string;
  screenshot?: string | null;
}

const SitesPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSite, setDeletingSite] = useState<string | null>(null);
  const [editingSubdomain, setEditingSubdomain] = useState<string | null>(null);
  const [tempSubdomain, setTempSubdomain] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { 
    dataUser, 
    setDataUser,    
    credits, 
    setCredits, 
    admin, 
    setAdmin,
    subsTplan, 
    setSubsTplan, 
    subsCancel, 
    setSubsCancel    
  } = context;

  const isPremiumUser = subsTplan === "STARTER" || subsTplan === "CREATOR";

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

  // Update subdomain
  const updateSubdomain = async (siteId: string, originalSubdomain: string, newSubdomain: string) => {
    if (!newSubdomain || newSubdomain === originalSubdomain) {
      setEditingSubdomain(null);
      return;
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(newSubdomain) || newSubdomain.length < 3 || newSubdomain.length > 50) {
      toast.error('Invalid subdomain format. Use only letters, numbers, and hyphens (3-50 characters)');
      return;
    }

    try {
      const response = await fetch('/api/update-subdomain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dataUser?.id}`
        },
        body: JSON.stringify({
          originalSubdomain: originalSubdomain,
          newSubdomain: newSubdomain
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update subdomain');
      }

      toast.success('Site URL updated successfully');
      
      // Update the sites list
      setSites(sites.map(site => 
        site.subdomain === originalSubdomain 
          ? { ...site, subdomain: newSubdomain, url: `https://${newSubdomain}.simplerb.com` }
          : site
      ));
      
      setEditingSubdomain(null);
    } catch (error) {
      console.error('Error updating subdomain:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update site URL');
    }
  };

  // Start editing subdomain
  const startEditingSubdomain = (subdomain: string) => {
    setEditingSubdomain(subdomain);
    setTempSubdomain(subdomain);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSubdomain(null);
    setTempSubdomain('');
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
      <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-4 min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-4 min-h-screen bg-white">
      <Toaster position="top-center" />
      <Head>
        <title>My Sites - SimplerB</title>
        <meta name="description" content="Manage your published websites" />
      </Head>

      {/* Hidden form for checkout */}
      <form action="/api/checkout_sessions" method="POST" style={{ display: 'none' }}>
        <input type="hidden" name="tipo" value="STARTER" />
      </form>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-8 sm:mt-12">
        <div className="absolute top-4 left-4 flex items-center space-x-3">
          {/* Logo */}
          <div className="flex items-center space-x-0.5">
            <span className="text-gray-800 font-semibold text-lg">simpler</span>
            <div className="w-4 h-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
          </div>
          
          {/* Tool Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => router.push('/domain')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Domain
            </button>
            <button 
              onClick={() => router.push('/web')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Website
            </button>
            <button 
              onClick={() => router.push('/find-keywords')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Keywords
            </button>
            <button 
              onClick={() => router.push('/ads')}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Ads
            </button>
          </div>

          {/* Website Builder Navigation */}
          <div className="flex items-center space-x-1 bg-blue-50 rounded-lg p-1 ml-4">
            <button 
              onClick={() => router.push('/web')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                router.pathname === '/web' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              Builder
            </button>
            <button 
              onClick={() => router.push('/sites')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                router.pathname === '/sites' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-blue-600 hover:bg-blue-100'
              }`}
            >
              My Sites
            </button>
          </div>
        </div>

        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            gap: 2,
            alignItems: "center",
          }}
        >
          {isSignedIn ? (
            <>
              <form action="/api/checkout_sessions" method="POST">
                <input type="hidden" name="tipo" value="STARTER" />
                <Button
                  className="bg-black cursor-pointer hover:bg-black/80 rounded-xl"
                  style={{ textTransform: "none" }}
                  sx={{
                    padding: { xs: "3px", sm: 1 },
                    display:
                      isSignedIn &&
                      (subsTplan === "STARTER" || subsTplan === "CREATOR")
                        ? "none"
                        : "block",
                  }}
                  type="submit"
                  variant="contained"
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget.form;
                    if (form) {
                      form.submit();
                    } else {
                      console.error("Form not found");
                    }
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <DiamondIcon sx={{ mr: 0.2, fontSize: "1rem" }} />
                    Become a Member
                  </Box>
                </Button>
              </form>
              <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
            </>
          ) : (
            <button
              onClick={() => openSignIn()}
              className="group relative bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-black/20 shadow-lg hover:shadow-xl"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <LoginIcon sx={{ fontSize: '1rem' }} />
                Sign in / up
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          )}
        </Box>

        {/* Main Content Area */}
        <div className="w-full max-w-6xl mx-auto mt-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-left">
              <p className="text-gray-600">Manage your published websites</p>
            </div>
            <Link 
              href="/web"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Create New Site</span>
            </Link>
          </div>

          {/* Sites Content */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm">
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
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Your First Site</span>
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sites
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((site) => (
                    <div key={site.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                      {/* Site Preview */}
                      <div className="aspect-video bg-gray-100 overflow-hidden relative">
                        {site.screenshot ? (
                          <img 
                            src={site.screenshot} 
                            alt={`Preview of ${site.subdomain}.simplerb.com`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to iframe if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const iframe = target.nextElementSibling as HTMLElement;
                              if (iframe) iframe.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <iframe
                          src={`/api/site-preview?subdomain=${site.subdomain}`}
                          className={`w-full h-full border-0 ${site.screenshot ? 'hidden' : 'block'}`}
                          style={{ display: site.screenshot ? 'none' : 'block' }}
                          sandbox="allow-same-origin"
                          title={`Preview of ${site.subdomain}.simplerb.com`}
                          onError={() => {
                            // Show placeholder if iframe fails
                            const iframe = document.querySelector(`iframe[src="/api/site-preview?subdomain=${site.subdomain}"]`) as HTMLElement;
                            if (iframe) {
                              iframe.style.display = 'none';
                              const placeholder = iframe.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }
                          }}
                        />
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-gray-100"
                          style={{ display: site.screenshot ? 'none' : 'none' }}
                        >
                          <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-500">Website Preview</p>
                          </div>
                        </div>
                      </div>

                      {/* Site Info */}
                      <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-2 truncate">
                          {site.description || 'Untitled Site'}
                        </h3>
                         <div className="text-sm text-gray-600 mb-4">
                           {editingSubdomain === site.subdomain ? (
                             <div className="space-y-2">
                               <div className="flex items-center space-x-1">
                                 <span className="text-gray-500 text-xs">https://</span>
                                 <input
                                   type="text"
                                   value={tempSubdomain}
                                   onChange={(e) => setTempSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                   className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                                   placeholder="subdomain"
                                   maxLength={50}
                                   autoFocus
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       updateSubdomain(site.id, site.subdomain, tempSubdomain);
                                     } else if (e.key === 'Escape') {
                                       cancelEditing();
                                     }
                                   }}
                                 />
                                 <span className="text-gray-500 text-xs">.simplerb.com</span>
                               </div>
                               <div className="flex items-center space-x-2 justify-end">
                                 <button
                                   onClick={() => updateSubdomain(site.id, site.subdomain, tempSubdomain)}
                                   className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                 >
                                   Save
                                 </button>
                                 <button
                                   onClick={cancelEditing}
                                   className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500 transition-colors"
                                 >
                                   Cancel
                                 </button>
                               </div>
                             </div>
                           ) : (
                            <div className="flex items-center justify-between">
                              <span>{site.subdomain}.simplerb.com</span>
                              <button
                                onClick={() => startEditingSubdomain(site.subdomain)}
                                className="text-gray-400 hover:text-gray-600 text-sm ml-2"
                                title="Edit URL"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        
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
                            className="flex-1 bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm hover:shadow-md"
                          >
                            View Site
                          </a>
                          <Link
                            href={`/web?edit=${site.subdomain}`}
                            className="flex-1 bg-gray-100 text-gray-700 text-center px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm shadow-sm hover:shadow-md"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => deleteSite(site.id, site.subdomain)}
                            disabled={deletingSite === site.id}
                            className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
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
                <TablePagination
                  rowsPerPageOptions={[25, 50, 100]}
                  component="div"
                  count={sites.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SitesPage;
