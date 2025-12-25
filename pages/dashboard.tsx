import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/DashboardLayout';
import SBRContext from '../context/SBRContext';
import LoadingDots from '../components/LoadingDots';
import { getAuth } from '@clerk/nextjs/server';
import Dialog from '@mui/material/Dialog';
import {
  getLastNDaysInTimezone,
  getTodayInTimezone,
  getYesterdayInTimezone,
  DEFAULT_TIMEZONE,
} from '../utils/googleAdsDates';

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
  category?: string | null;
  created_at: string;
  monthly_search_volumes?: Array<{
    month?: string;
    year?: number;
    monthIndex?: number;
    monthLabel?: string;
    dateKey?: string;
    monthlySearches: number;
  }>;
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

interface ContactLead {
  id: number;
  subdomain: string | null;
  name: string | null;
  email: string | null;
  message: string;
  created_at: string;
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  cpa: number;
  impressionShare?: number;
}

type CampaignsColumns = {
  name: boolean;
  impressions: boolean;
  clicks: boolean;
  ctr: boolean;
  cost: boolean;
  avgCpc: boolean;
  conversions: boolean;
  conversionRate: boolean;
  cpa: boolean;
  conversionValue: boolean;
  impressionShare: boolean;
};

type MonthlyTrendPoint = NonNullable<KeywordFavorite['monthly_search_volumes']>[number];

const MonthlyTrendChart: React.FC<{ keyword: string; trend: MonthlyTrendPoint[] }> = ({ keyword, trend }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const lastTwelve = trend.slice(-12);
  const maxVolume = Math.max(...lastTwelve.map((point) => point.monthlySearches));
  const minVolume = Math.min(...lastTwelve.map((point) => point.monthlySearches));
  const chartRange = maxVolume - minVolume;
  const chartHeight = 40;
  const yAxisWidth = 45;
  const paddingTop = 5;
  const paddingBottom = 5;
  const innerRange = 100 - paddingTop - paddingBottom;

  const formatTopNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
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

      <div
        className="absolute right-0 top-0 text-xs text-gray-500 font-medium"
        style={{ width: `${yAxisWidth - 4}px`, textAlign: 'left', paddingLeft: '4px' }}
      >
        {formatTopNumber(maxVolume)}
      </div>

      <svg
        className="w-full"
        height={chartHeight}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {lastTwelve.length > 1 && (
          <>
            <path
              d={lastTwelve
                .map((point, idx) => {
                  const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
                  const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
                  const y = paddingTop + (1 - normalized) * innerRange;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="rgb(99,102,241)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {lastTwelve.map((point, idx) => {
              const normalized = chartRange === 0 ? 0.5 : (point.monthlySearches - minVolume) / chartRange;
              const x = lastTwelve.length === 1 ? 50 : (idx / (lastTwelve.length - 1)) * 100;
              const y = paddingTop + (1 - normalized) * innerRange;
              const isHovered = hoveredIndex === idx;

              return (
                <g key={`${keyword}-${point.dateKey}`} onMouseEnter={() => setHoveredIndex(idx)} className="cursor-pointer">
                  <circle cx={x} cy={y} r="6" fill="transparent" />
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? '1.5' : '0.8'}
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

const CAMPAIGNS_COLUMNS_STORAGE_KEY = 'dashboard-campaigns-columns';
const CAMPAIGNS_DATE_PRESET_STORAGE_KEY = 'dashboard-campaigns-date-preset';
const CAMPAIGNS_DATE_RANGE_STORAGE_KEY = 'dashboard-campaigns-date-range';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user: realUser, isLoaded, isSignedIn } = useUser();
  const [user, setUser] = useState<any>(null);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<KeywordFavorite[]>([]);
  const [domainFavorites, setDomainFavorites] = useState<DomainFavorite[]>([]);
  const [publishedSites, setPublishedSites] = useState<PublishedSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainLoading, setDomainLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [userTimeZone, setUserTimeZone] = useState<string>(() => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
    return 'UTC';
  });
  const [renamingSubdomain, setRenamingSubdomain] = useState<string | null>(null);
  const [newSubdomain, setNewSubdomain] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [publishedSitesFilter, setPublishedSitesFilter] = useState<'all' | 'favorites' | 'non-favorites'>('favorites');
  const [publishedSitesSearch, setPublishedSitesSearch] = useState<string>('');
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  
  // Selection state for copy to clipboard
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    const stored = localStorage.getItem('dashboard-category-filter');
    return stored || 'all';
  });
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null);
  const [savingCategoryFor, setSavingCategoryFor] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [moveTargetCategory, setMoveTargetCategory] = useState<string>('');
  const UNCATEGORIZED_KEY = '__uncategorized__';
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const normalizeCategory = (value?: string | null) => (value ? value.trim() : '');
  const displayCategory = (value?: string | null) => normalizeCategory(value) || 'Uncategorized';

  const allCategories = useMemo(() => {
    const collected = new Set<string>();
    favorites.forEach((fav) => {
      const cat = normalizeCategory(fav.category);
      if (cat) collected.add(cat);
    });
    customCategories.forEach((cat) => {
      const normalized = normalizeCategory(cat);
      if (normalized) collected.add(normalized);
    });
    return [UNCATEGORIZED_KEY, ...Array.from(collected).sort((a, b) => a.localeCompare(b))];
  }, [favorites, customCategories]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { [UNCATEGORIZED_KEY]: 0 };
    favorites.forEach((fav) => {
      const key = normalizeCategory(fav.category) || UNCATEGORIZED_KEY;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [favorites]);

  const favoritesLastUpdatedAt = useMemo(() => {
    if (favorites.length === 0) return null;

    const maxTs = favorites.reduce<number>((acc, item) => {
      const t = item.created_at ? new Date(item.created_at).getTime() : 0;
      return Number.isFinite(t) ? Math.max(acc, t) : acc;
    }, 0);

    if (!maxTs) return null;

    try {
      return new Date(maxTs).toLocaleString(undefined, { timeZone: userTimeZone });
    } catch (err) {
      console.error('Error formatting last updated time:', err);
      return new Date(maxTs).toLocaleString();
    }
  }, [favorites, userTimeZone]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter((fav) => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === UNCATEGORIZED_KEY) return !normalizeCategory(fav.category);
      return normalizeCategory(fav.category) === normalizeCategory(categoryFilter);
    });
  }, [favorites, categoryFilter]);

  const sortedFavorites = useMemo(() => {
    return [...filteredFavorites].sort((a, b) => {
      const aCat = normalizeCategory(a.category) || 'zzzz';
      const bCat = normalizeCategory(b.category) || 'zzzz';
      if (aCat !== bCat) return aCat.localeCompare(bCat);
      return a.keyword.localeCompare(b.keyword);
    });
  }, [filteredFavorites]);

  // Match 3-mo change logic used in /find-keywords
  const calculateThreeMonthChange = (monthlyData?: KeywordFavorite['monthly_search_volumes']): string => {
    if (!monthlyData || monthlyData.length < 4) return 'N/A';

    const totalMonths = monthlyData.length;
    const lastMonth = monthlyData[totalMonths - 1]; // Most recent month
    const threeMonthsAgo = monthlyData[totalMonths - 4]; // 3 months ago

    if (!lastMonth || !threeMonthsAgo) return 'N/A';

    const lastMonthSearches = lastMonth.monthlySearches ?? 0;
    const threeMonthsAgoSearches = threeMonthsAgo.monthlySearches ?? 0;

    if (threeMonthsAgoSearches === 0) return lastMonthSearches > 0 ? '+∞%' : '0%';

    const change = ((lastMonthSearches - threeMonthsAgoSearches) / threeMonthsAgoSearches) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const renderMonthlyTrend = (keyword: string, trend?: KeywordFavorite['monthly_search_volumes']) => {
    if (!trend || trend.length === 0) {
      return <span className="text-xs text-gray-400">No trend data</span>;
    }

    return <MonthlyTrendChart keyword={keyword} trend={trend} />;
  };

  const getFavoritesLastMonthLabel = (): string | null => {
    const firstWithTrend = favorites.find(
      (fav) => fav.monthly_search_volumes && fav.monthly_search_volumes.length > 0
    );
    if (!firstWithTrend?.monthly_search_volumes) return null;

    const lastPoint =
      firstWithTrend.monthly_search_volumes[firstWithTrend.monthly_search_volumes.length - 1];
    if (!lastPoint || !lastPoint.monthLabel) return null;

    return lastPoint.monthLabel.split(' ')[0];
  };

  // Compute filtered sites
  const filteredPublishedSites = publishedSites.filter(site => {
    // First apply favorite filter
    switch (publishedSitesFilter) {
      case 'favorites':
        if (site.favorite !== true) return false;
        break;
      case 'non-favorites':
        if (site.favorite !== false) return false;
        break;
      case 'all':
      default:
        break;
    }

    // Then apply search filter
    if (publishedSitesSearch.trim()) {
      const searchLower = publishedSitesSearch.toLowerCase();
      const subdomainMatch = site.subdomain.toLowerCase().includes(searchLower);
      const descriptionMatch = site.description ? site.description.toLowerCase().includes(searchLower) : false;
      return subdomainMatch || descriptionMatch;
    }

    return true;
  });

  // Section ordering state
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'favorites',
    'domain-favorites',
    'published-sites',
    'leads',
    'ads',
    'feature-cards'
  ]);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);

  // Section minimization state
  const [minimizedSections, setMinimizedSections] = useState<Set<string>>(new Set());

  // Ads/Campaigns state
  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { admin, setAdmin } = context;
  const [campaignsSummary, setCampaignsSummary] = useState<CampaignSummary[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsVisibleColumns, setCampaignsVisibleColumns] = useState<CampaignsColumns>({
    name: true,
    impressions: true,
    clicks: true,
    ctr: true,
    cost: true,
    avgCpc: true,
    conversions: true,
    conversionRate: true,
    cpa: true,
    conversionValue: true,
    impressionShare: true,
  });
  const [showCampaignsColumnSelector, setShowCampaignsColumnSelector] = useState(false);
  const campaignsColumnSelectorRef = useRef<HTMLDivElement>(null);
  const campaignsColumnDropdownRef = useRef<HTMLDivElement>(null);
  const [accountTimezone, setAccountTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [timezoneLoaded, setTimezoneLoaded] = useState<boolean>(false);
  const campaignPrefsLoadedRef = useRef<boolean>(false);
  const campaignDatesInitializedRef = useRef<boolean>(false);
  const initialCampaignDatePresetRef = useRef<string>('last7days');
  
  // Date filter state for campaigns
  const last7Days = getLastNDaysInTimezone(7, DEFAULT_TIMEZONE);
  const [campaignsStartDate, setCampaignsStartDate] = useState<string>(last7Days.startDate);
  const [campaignsEndDate, setCampaignsEndDate] = useState<string>(last7Days.endDate);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('last7days');


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
                setAdmin(userData.user.admin || false);
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

  // Capture user timezone on the client
  useEffect(() => {
    if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
      const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTz) {
        setUserTimeZone(detectedTz);
      }
    }
  }, []);

  // Load section order and minimized sections from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('dashboard-section-order');
    if (savedOrder) {
      try {
        const parsedOrder = JSON.parse(savedOrder);
        // Validate that all required sections are present
        const defaultOrder = ['favorites', 'domain-favorites', 'published-sites', 'leads', 'ads', 'feature-cards'];
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
        setSectionOrder(['favorites', 'domain-favorites', 'published-sites', 'leads', 'ads', 'feature-cards']);
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

  // Persist category filter
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard-category-filter', categoryFilter);
  }, [categoryFilter]);

  // Load published sites filter/search from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedFilter = localStorage.getItem('dashboard-published-sites-filter');
    if (storedFilter === 'all' || storedFilter === 'favorites' || storedFilter === 'non-favorites') {
      setPublishedSitesFilter(storedFilter);
    }

    const storedSearch = localStorage.getItem('dashboard-published-sites-search');
    if (storedSearch !== null) {
      setPublishedSitesSearch(storedSearch);
    }
  }, []);

  // Persist published sites filter/search
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard-published-sites-filter', publishedSitesFilter);
  }, [publishedSitesFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dashboard-published-sites-search', publishedSitesSearch);
  }, [publishedSitesSearch]);

  // Load saved campaigns preferences (columns + date filters) once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (campaignPrefsLoadedRef.current) return;

    try {
      const savedColumns = localStorage.getItem(CAMPAIGNS_COLUMNS_STORAGE_KEY);
      if (savedColumns) {
        const parsed = JSON.parse(savedColumns);
        if (parsed && typeof parsed === 'object') {
          setCampaignsVisibleColumns((prev) => ({ ...prev, ...parsed }));
        }
      }

      const savedPreset = localStorage.getItem(CAMPAIGNS_DATE_PRESET_STORAGE_KEY);
      if (savedPreset) {
        setSelectedDatePreset(savedPreset);
        initialCampaignDatePresetRef.current = savedPreset;
      }

      const savedRange = localStorage.getItem(CAMPAIGNS_DATE_RANGE_STORAGE_KEY);
      if (savedRange) {
        const parsedRange = JSON.parse(savedRange);
        if (parsedRange?.startDate && parsedRange?.endDate) {
          setCampaignsStartDate(parsedRange.startDate);
          setCampaignsEndDate(parsedRange.endDate);
          campaignDatesInitializedRef.current = true;
        }
      }
    } catch (err) {
      console.error('Error loading dashboard state from localStorage:', err);
    } finally {
      campaignPrefsLoadedRef.current = true;
    }
  }, []);

  // Persist campaigns columns selection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CAMPAIGNS_COLUMNS_STORAGE_KEY, JSON.stringify(campaignsVisibleColumns));
  }, [campaignsVisibleColumns]);

  // Persist campaigns date preset
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CAMPAIGNS_DATE_PRESET_STORAGE_KEY, selectedDatePreset);
  }, [selectedDatePreset]);

  // Persist campaigns date range
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      CAMPAIGNS_DATE_RANGE_STORAGE_KEY,
      JSON.stringify({ startDate: campaignsStartDate, endDate: campaignsEndDate })
    );
  }, [campaignsStartDate, campaignsEndDate]);

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

  // Refresh favorites by updating data from Google Ads API, then reload table
  const refreshFavorites = async () => {
    if (!user || !user.id) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/keyword-favorites-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error('Failed to refresh favorites:', resp.status, resp.statusText, text);
      }
    } catch (e) {
      console.error('Error refreshing favorites:', e);
    } finally {
      // Always re-fetch the latest favorites after attempting refresh
      await fetchFavorites();
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

  // Fetch account timezone on mount
  useEffect(() => {
    const fetchTimezone = async () => {
      if (!isLoaded || !realUser || !admin || !realUser.emailAddresses[0]?.emailAddress) {
        return;
      }

      try {
        const response = await fetch('/api/google-ads/timezone', {
          headers: {
            'x-user-email': realUser.emailAddresses[0].emailAddress,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.timezone) {
            setAccountTimezone(data.timezone);
            setTimezoneLoaded(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch account timezone:', error);
        setTimezoneLoaded(true);
      }
    };

    fetchTimezone();
  }, [isLoaded, realUser, admin]);

  // Update dates when timezone loads
  useEffect(() => {
    if (!timezoneLoaded) return;
    if (!campaignDatesInitializedRef.current) {
      handleDatePresetChange(initialCampaignDatePresetRef.current || 'last7days');
      campaignDatesInitializedRef.current = true;
    }
  }, [timezoneLoaded, accountTimezone]);

  // Fetch campaigns summary
  const fetchCampaignsSummary = useCallback(async () => {
    if (!realUser?.emailAddresses[0]?.emailAddress || !admin) {
      return;
    }

    setLoadingCampaigns(true);
    try {
      const params = new URLSearchParams();
      params.append('startDate', campaignsStartDate);
      params.append('endDate', campaignsEndDate);

      const response = await fetch(`/api/google-ads/metrics?${params.toString()}`, {
        headers: { 'x-user-email': realUser.emailAddresses[0].emailAddress }
      });
      const data = await response.json();
      if (response.ok && data.success && data.metrics?.campaigns) {
        setCampaignsSummary(data.metrics.campaigns as CampaignSummary[]);
      }
    } catch (error) {
      console.error('Error fetching campaigns summary:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [campaignsStartDate, campaignsEndDate, realUser, admin]);

  // Auto-fetch campaigns when date range changes (and admin)
  useEffect(() => {
    if (!isLoaded || !realUser || !admin) return;
    fetchCampaignsSummary();
  }, [isLoaded, realUser, admin, fetchCampaignsSummary]);

  // Close campaigns column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideButton = campaignsColumnSelectorRef.current && !campaignsColumnSelectorRef.current.contains(event.target as Node);
      const isOutsideDropdown = campaignsColumnDropdownRef.current && !campaignsColumnDropdownRef.current.contains(event.target as Node);

      if (isOutsideButton && isOutsideDropdown) {
        setShowCampaignsColumnSelector(false);
      }
    };
    if (showCampaignsColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCampaignsColumnSelector]);

  // Date filter helper functions
  const handleDatePresetChange = (preset: string) => {
    const tz = timezoneLoaded ? accountTimezone : DEFAULT_TIMEZONE;
    let startDateStr: string;
    let endDateStr: string;

    switch (preset) {
      case 'last7days':
        ({ startDate: startDateStr, endDate: endDateStr } = getLastNDaysInTimezone(7, tz));
        break;
      case 'today':
        startDateStr = endDateStr = getTodayInTimezone(tz);
        break;
      case 'yesterday':
        startDateStr = endDateStr = getYesterdayInTimezone(tz);
        break;
      default:
        return;
    }

    setCampaignsStartDate(startDateStr);
    setCampaignsEndDate(endDateStr);
    setSelectedDatePreset(preset);
  };

  const formatCurrency = (micros: number) => {
    return `$${(micros / 1000000).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

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

  // Fetch recent contact leads for the signed-in user
  const fetchLeads = useCallback(async () => {
    if (!isSignedIn) return;
    setLeadsLoading(true);
    try {
      const resp = await fetch('/api/contact-leads');
      if (!resp.ok) {
        throw new Error('Failed to load leads');
      }
      const data = await resp.json();
      if (data?.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLeadsLoading(false);
    }
  }, [isSignedIn]);


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

  // Copy selected keywords to clipboard
  const copySelectedKeywords = () => {
    const selected = favorites.filter(fav => selectedKeywords.has(fav.keyword));
    if (selected.length === 0) return;
    
    const text = selected.map(fav => fav.keyword).join('\n');
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Copy selected domains to clipboard
  const copySelectedDomains = () => {
    const selected = domainFavorites.filter(fav => selectedDomains.has(fav.namedomain));
    if (selected.length === 0) return;
    
    const text = selected.map(fav => fav.namedomain).join('\n');
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  // Copy selected sites to clipboard
  const copySelectedSites = () => {
    const selected = filteredPublishedSites.filter(site => selectedSites.has(site.id));
    if (selected.length === 0) return;
    
    const text = selected.map(site => `${site.subdomain}.simplerb.com`).join('\n');
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleCreateCategory = () => {
    const normalized = normalizeCategory(newCategoryName);
    if (!normalized) return;
    if (!customCategories.some(cat => normalizeCategory(cat) === normalized)) {
      setCustomCategories([...customCategories, normalized]);
    }
    setCategoryFilter(normalized);
    setNewCategoryName('');
  };

  const updateKeywordCategory = async (keyword: string, categoryKey: string | null) => {
    setSavingCategoryFor(keyword);
    setCategoryError(null);
    const finalCategory = categoryKey === UNCATEGORIZED_KEY ? null : categoryKey;
    try {
      const resp = await fetch('/api/keyword-favorites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, category: finalCategory })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to update category');
      }

      setFavorites(prev =>
        prev.map(fav =>
          fav.keyword === keyword ? { ...fav, category: finalCategory } : fav
        )
      );

      if (finalCategory && !customCategories.some(cat => normalizeCategory(cat) === normalizeCategory(finalCategory))) {
        setCustomCategories([...customCategories, finalCategory]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error updating category';
      setCategoryError(message);
      console.error(message);
    } finally {
      setSavingCategoryFor(null);
      setDraggedKeyword(null);
    }
  };

  const handleDropCategory = (categoryKey: string) => {
    if (!draggedKeyword) return;
    const targetCategory = categoryKey === UNCATEGORIZED_KEY ? '' : normalizeCategory(categoryKey);
    const current = favorites.find((fav) => fav.keyword === draggedKeyword);
    if (current && normalizeCategory(current.category) === targetCategory) {
      setDraggedKeyword(null);
      return;
    }
    updateKeywordCategory(draggedKeyword, categoryKey);
  };

  const updateSelectedKeywordsCategory = async (keywords: string[], categoryKey: string) => {
    if (keywords.length === 0) return;
    setSavingCategoryFor('__bulk__');
    setCategoryError(null);
    const finalCategory = categoryKey === UNCATEGORIZED_KEY ? null : categoryKey;
    try {
      await Promise.all(
        keywords.map((keyword) =>
          fetch('/api/keyword-favorites', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, category: finalCategory }),
          }).then((resp) => {
            if (!resp.ok) {
              return resp.text().then((t) => {
                throw new Error(t || 'Failed to update category');
              });
            }
          })
        )
      );

      setFavorites((prev) =>
        prev.map((fav) =>
          keywords.includes(fav.keyword) ? { ...fav, category: finalCategory } : fav
        )
      );

      if (finalCategory && !customCategories.some((cat) => normalizeCategory(cat) === normalizeCategory(finalCategory))) {
        setCustomCategories([...customCategories, finalCategory]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error updating category';
      setCategoryError(message);
      console.error(message);
    } finally {
      setSavingCategoryFor(null);
    }
  };

  // Delete published site
  const deleteSite = async (siteId: string, subdomain: string) => {
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
          siteId,
        }),
      });

      if (response.ok) {
        // Remove from local state
        setPublishedSites(publishedSites.filter(site => site.id !== siteId));
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
                  <h2 className="text-lg font-semibold text-gray-900">Opportunities</h2>
                  <button
                    onClick={() => refreshFavorites()}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title="Refresh keyword data"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  {favoritesLastUpdatedAt && (
                    <span className="text-[8px] text-gray-400">Last update: {favoritesLastUpdatedAt}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedKeywords.size > 0 && (
                    <button
                      onClick={copySelectedKeywords}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Copy Selected ({selectedKeywords.size})
                    </button>
                  )}
                  {selectedKeywords.size > 0 && (
                    <select
                      value={moveTargetCategory || 'choose'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'choose') return;
                        if (val === '__add__') {
                          const name = window.prompt('New category name?');
                          const normalized = normalizeCategory(name || '');
                          if (normalized) {
                            if (!customCategories.some((cat) => normalizeCategory(cat) === normalized)) {
                              setCustomCategories([...customCategories, normalized]);
                            }
                            updateSelectedKeywordsCategory(Array.from(selectedKeywords), normalized);
                            setCategoryFilter(normalized);
                            setMoveTargetCategory(normalized);
                          }
                          e.target.value = 'choose';
                          return;
                        }
                        updateSelectedKeywordsCategory(Array.from(selectedKeywords), val);
                        setMoveTargetCategory(val);
                      }}
                      className="h-9 bg-white border border-gray-200 rounded px-2 text-sm text-gray-700 focus:border-gray-300 focus:outline-none"
                      title="Move selected keywords"
                    >
                      <option value="choose">Move to...</option>
                      <option value={UNCATEGORIZED_KEY}>Uncategorized</option>
                      {allCategories
                        .filter((cat) => cat !== UNCATEGORIZED_KEY)
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      <option value="__add__">+ Add category</option>
                    </select>
                  )}
                  <div className="hidden sm:flex flex-wrap items-center gap-2">
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__add__') {
                          const name = window.prompt('New category name?');
                          const normalized = normalizeCategory(name || '');
                          if (normalized) {
                            if (!customCategories.some(cat => normalizeCategory(cat) === normalized)) {
                              setCustomCategories([...customCategories, normalized]);
                            }
                            setCategoryFilter(normalized);
                          } else {
                            setCategoryFilter('all');
                          }
                          return;
                        }
                        setCategoryFilter(val);
                      }}
                      className="h-8 bg-white border border-gray-200 rounded px-2 text-xs text-gray-700 focus:border-gray-300 focus:outline-none"
                      title="Filter categories"
                    >
                      <option value="all">All</option>
                      <option value={UNCATEGORIZED_KEY}>
                        Uncategorized ({categoryCounts[UNCATEGORIZED_KEY] || 0})
                      </option>
                      {allCategories
                        .filter((cat) => cat !== UNCATEGORIZED_KEY)
                        .map((cat) => (
                          <option key={cat} value={cat}>
                            {cat} ({categoryCounts[cat] || 0})
                          </option>
                        ))}
                      <option value="__add__">+ Add category</option>
                    </select>
                  </div>
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
                  <a
                    href="/find-keywords"
                    className="ml-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                  >
                    Find Opportunities
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your saved keywords for research opportunities</p>
            </div>
            <div className="border-b border-gray-100" />
            {categoryError && (
              <div className="px-6 py-2 border-b border-gray-100 bg-red-50 text-red-700 text-sm">
                {categoryError}
              </div>
            )}

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
                      className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                    >
                      Find Keywords
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 w-12">
                            <input
                              type="checkbox"
                              checked={sortedFavorites.length > 0 && sortedFavorites.every(fav => selectedKeywords.has(fav.keyword))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedKeywords(new Set(sortedFavorites.map(fav => fav.keyword)));
                                } else {
                                  setSelectedKeywords(new Set());
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Keyword</th>
                          {categoryFilter === 'all' && (
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Category</th>
                          )}
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Volume</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Competition</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">3-mo Change</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Country</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                            {getFavoritesLastMonthLabel() ? `Trend (${getFavoritesLastMonthLabel()})` : 'Trend'}
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFavorites.map((favorite) => (
                          <tr
                            key={favorite.keyword}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              draggedKeyword === favorite.keyword ? 'opacity-60' : ''
                            }`}
                            draggable
                            onDragStart={() => setDraggedKeyword(favorite.keyword)}
                            onDragEnd={() => setDraggedKeyword(null)}
                          >
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedKeywords.has(favorite.keyword)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedKeywords);
                                  if (e.target.checked) {
                                    newSelected.add(favorite.keyword);
                                  } else {
                                    newSelected.delete(favorite.keyword);
                                  }
                                  setSelectedKeywords(newSelected);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{favorite.keyword}</td>
                            {categoryFilter === 'all' && (
                              <td className="py-4 px-4 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                    {displayCategory(favorite.category)}
                                  </span>
                                  {savingCategoryFor === favorite.keyword && (
                                    <span className="text-xs text-gray-500">Updating...</span>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.search_volume?.toLocaleString() || 'N/A'}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  favorite.competition === 'LOW' ? 'bg-green-100 text-green-700' :
                                  favorite.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                  favorite.competition === 'HIGH' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {favorite.competition || 'UNKNOWN'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {favorite.competition_index !== null && favorite.competition_index !== undefined
                                    ? `(${favorite.competition_index})`
                                    : '(N/A)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <span className={`font-medium ${
                                calculateThreeMonthChange(favorite.monthly_search_volumes).startsWith('+')
                                  ? 'text-gray-700'
                                  : calculateThreeMonthChange(favorite.monthly_search_volumes).startsWith('-')
                                  ? 'text-gray-500'
                                  : 'text-gray-500'
                              }`}>
                                {calculateThreeMonthChange(favorite.monthly_search_volumes)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">{favorite.country_code || 'N/A'}</td>
                            <td className="py-4 px-4 align-middle">
                              {renderMonthlyTrend(favorite.keyword, favorite.monthly_search_volumes)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => removeFavorite(favorite.keyword)}
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
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
                  {selectedDomains.size > 0 && (
                    <button
                      onClick={copySelectedDomains}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Copy Selected ({selectedDomains.size})
                    </button>
                  )}
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
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
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
                      className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                    >
                      Generate Domains
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 w-12">
                            <input
                              type="checkbox"
                              checked={domainFavorites.length > 0 && domainFavorites.every(fav => selectedDomains.has(fav.namedomain))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDomains(new Set(domainFavorites.map(fav => fav.namedomain)));
                                } else {
                                  setSelectedDomains(new Set());
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </th>
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
                              <input
                                type="checkbox"
                                checked={selectedDomains.has(favorite.namedomain)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedDomains);
                                  if (e.target.checked) {
                                    newSelected.add(favorite.namedomain);
                                  } else {
                                    newSelected.delete(favorite.namedomain);
                                  }
                                  setSelectedDomains(newSelected);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-gray-900">{favorite.namedomain || 'N/A'}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                favorite.available === true
                                  ? 'bg-gray-100 text-gray-800'
                                  : favorite.available === false
                                  ? 'bg-gray-200 text-gray-700'
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
                                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
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
                  <h2 className="text-lg font-semibold text-gray-900">Web</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`relative flex items-center transition-all duration-200 ${searchExpanded || publishedSitesSearch ? 'w-56 sm:w-64' : 'w-9'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSearchExpanded(true)}
                      className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 hover:text-gray-700"
                      aria-label="Search websites"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      placeholder="Search sites..."
                      value={publishedSitesSearch}
                      onChange={(e) => setPublishedSitesSearch(e.target.value)}
                      onFocus={() => setSearchExpanded(true)}
                      onBlur={() => {
                        if (!publishedSitesSearch.trim()) {
                          setSearchExpanded(false);
                        }
                      }}
                      className={`bg-white border border-gray-200 rounded pl-8 pr-3 text-sm text-gray-700 focus:border-purple-500 focus:outline-none transition-all duration-200 ${
                        searchExpanded || publishedSitesSearch
                          ? 'py-1 opacity-100'
                          : 'py-0 h-9 opacity-0 pointer-events-none'
                      }`}
                    />
                  </div>
                  <select
                    value={publishedSitesFilter}
                    onChange={(e) => setPublishedSitesFilter(e.target.value as 'all' | 'favorites' | 'non-favorites')}
                    className="bg-white border border-gray-200 rounded px-3 py-1 text-sm text-gray-700 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="favorites">⭐ Favorites Only</option>
                    <option value="non-favorites">Non-Favorites Only</option>
                    <option value="all">Show All Sites</option>
                  </select>
                  {selectedSites.size > 0 && (
                    <button
                      onClick={copySelectedSites}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Copy Selected ({selectedSites.size})
                    </button>
                  )}
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
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                  >
                    Create Website
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your published landing pages</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('published-sites') && (
              <div className="p-6">
                {sitesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading published sites...</p>
                  </div>
                ) : filteredPublishedSites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {publishedSites.length === 0 ? (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No published websites yet</h3>
                        <p className="text-gray-600 mb-6">Create and publish your first website to see it here.</p>
                        <a
                          href="/web"
                          className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                        >
                          Create Website
                        </a>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No websites match your filters</h3>
                        <p className="text-gray-600 mb-6">
                          {publishedSitesSearch ? 'Try adjusting your search terms or ' : ''}
                          Try changing your filter settings.
                        </p>
                        {(publishedSitesFilter !== 'all' || publishedSitesSearch) && (
                          <div className="flex items-center justify-center gap-2">
                            {publishedSitesFilter !== 'all' && (
                              <button
                                onClick={() => setPublishedSitesFilter('all')}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                              >
                                Show All Sites
                              </button>
                            )}
                            {publishedSitesSearch && (
                              <button
                                onClick={() => setPublishedSitesSearch('')}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                              >
                                Clear Search
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {renameError && renamingSubdomain && (
                      <div className="mx-6 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-800">{renameError}</p>
                      </div>
                    )}
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 w-12">
                            <input
                              type="checkbox"
                              checked={filteredPublishedSites.length > 0 && filteredPublishedSites.every(site => selectedSites.has(site.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSites(new Set(filteredPublishedSites.map(site => site.id)));
                                } else {
                                  setSelectedSites(new Set());
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Web</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Created</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Favorite</th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPublishedSites.map((site) => (
                          <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedSites.has(site.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedSites);
                                  if (e.target.checked) {
                                    newSelected.add(site.id);
                                  } else {
                                    newSelected.delete(site.id);
                                  }
                                  setSelectedSites(newSelected);
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
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
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => toggleSiteFavorite(site.id, site.favorite)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-50 text-yellow-500"
                                title={site.favorite ? 'Unfavorite' : 'Favorite'}
                              >
                                <svg
                                  className="w-5 h-5"
                                  viewBox="0 0 24 24"
                                  fill={site.favorite ? 'currentColor' : 'none'}
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                              </button>
                            </td>
                            <td className="py-4 px-4 text-center space-x-2">
                              {renamingSubdomain === site.subdomain ? (
                                <>
                                  <button
                                    onClick={() => renameSubdomain(site.subdomain, newSubdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
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
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
                                    title="View live site"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                  <button
                                    onClick={() => startRenaming(site.subdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                                    title="Rename subdomain"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteSite(site.id, site.subdomain)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
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
    'leads': {
      id: 'leads',
      title: 'Recent Leads',
      component: (
        <div
          id="leads"
          className={`w-full max-w-6xl mx-auto mb-8 transition-all duration-200 ${
            draggedSection === 'leads' ? 'opacity-50' : ''
          } ${minimizedSections.has('leads') ? 'h-24 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'leads')}
        >
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'leads')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'leads')}
                    onDragEnd={handleDragEnd}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
                  <button
                    onClick={() => fetchLeads()}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title="Refresh leads data"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMinimizeSection('leads')}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title={minimizedSections.has('leads') ? 'Maximize section' : 'Minimize section'}
                  >
                    {minimizedSections.has('leads') ? (
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
              </div>
              <p className="text-sm text-gray-600 mt-1">Contact form submissions from your published websites</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('leads') && (
              <div className="p-6">
                {leadsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading leads...</p>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
                    <p className="text-gray-600 mb-6">Contact form submissions from your published websites will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Website</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Message</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Contact</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                              {lead.subdomain || '—'}
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-700 max-w-xs">
                              <div className="truncate" title={lead.message}>
                                {lead.message.slice(0, 100)}
                                {lead.message.length > 100 ? '...' : ''}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">
                              <div className="flex flex-col gap-1">
                                {lead.name && <span className="font-medium text-gray-900">{lead.name}</span>}
                                {lead.email && <span>{lead.email}</span>}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-500">
                              {new Date(lead.created_at).toLocaleDateString()}
                              <div className="text-xs">
                                {new Date(lead.created_at).toLocaleTimeString()}
                              </div>
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
    'ads': {
      id: 'ads',
      title: 'Campaigns',
      component: (
        <div
          id="ads"
          className={`w-full max-w-6xl mx-auto mb-8 transition-all duration-200 relative ${
            draggedSection === 'ads' ? 'opacity-50' : ''
          } ${minimizedSections.has('ads') ? 'h-24 overflow-hidden' : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'ads')}
        >
          {/* Campaigns Column Selector Dropdown - positioned outside overflow-hidden container */}
          {showCampaignsColumnSelector && (
            <div ref={campaignsColumnDropdownRef} className="absolute right-6 top-16 z-50">
              <div className="bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 min-w-[220px]">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Show/Hide Columns</h3>
                  <button
                    onClick={() => setShowCampaignsColumnSelector(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(campaignsVisibleColumns).map(([key, value]) => (
                    <label
                      key={key}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => setCampaignsVisibleColumns(prev => ({...prev, [key]: !prev[key as keyof typeof prev]}))}
                        className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
                      />
                      <span className="text-sm text-gray-700">
                        {key === 'name' ? 'Campaign' :
                         key === 'avgCpc' ? 'Avg CPC' :
                         key === 'conversionRate' ? 'Conv. Rate' :
                         key === 'conversionValue' ? 'Conv. Value' :
                         key === 'impressionShare' ? 'Impr. Share' :
                         key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="cursor-move text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'ads')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'ads')}
                    onDragEnd={handleDragEnd}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Campaigns</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchCampaignsSummary()}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title="Refresh campaigns data"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleMinimizeSection('ads')}
                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                    title={minimizedSections.has('ads') ? 'Maximize section' : 'Minimize section'}
                  >
                    {minimizedSections.has('ads') ? (
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
                    href="/ads"
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                  >
                    View Campaigns
                  </a>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">Your Google Ads campaign performance</p>
            </div>

            {/* Content - only show if not minimized */}
            {!minimizedSections.has('ads') && (
              <div className="p-6">
                {!admin ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">Admin access required to view campaigns</p>
                  </div>
                ) : (
                  <>
                    {/* Date Filter */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 flex-shrink-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">Date Range</span>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'last7days', label: 'Last 7 days' },
                              { value: 'today', label: 'Today' },
                              { value: 'yesterday', label: 'Yesterday' },
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                onClick={() => handleDatePresetChange(preset.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  selectedDatePreset === preset.value
                                    ? 'bg-black text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Column Selector */}
                      <div className="flex justify-end relative ml-auto" ref={campaignsColumnSelectorRef}>
                        <button
                          onClick={() => setShowCampaignsColumnSelector(!showCampaignsColumnSelector)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                          </svg>
                          <span>Columns</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showCampaignsColumnSelector ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {loadingCampaigns ? (
                      <div className="text-center py-12">
                        <LoadingDots color="black" style="small" />
                        <p className="mt-4 text-gray-600">Loading campaigns...</p>
                      </div>
                    ) : campaignsSummary.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mb-4">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No campaign data</h3>
                        <p className="text-gray-600 mb-6">No campaign data available for the selected date range.</p>
                        <a
                          href="/ads"
                          className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 text-sm font-medium rounded-md transition-colors"
                        >
                          View Ads Dashboard
                        </a>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {campaignsVisibleColumns.name && (
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                              )}
                              {campaignsVisibleColumns.impressions && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impr.</th>
                              )}
                              {campaignsVisibleColumns.clicks && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                              )}
                              {campaignsVisibleColumns.ctr && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                              )}
                              {campaignsVisibleColumns.cost && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                              )}
                              {campaignsVisibleColumns.avgCpc && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg CPC</th>
                              )}
                              {campaignsVisibleColumns.conversions && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conv.</th>
                              )}
                              {campaignsVisibleColumns.conversionRate && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Rate</th>
                              )}
                              {campaignsVisibleColumns.cpa && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CPA</th>
                              )}
                              {campaignsVisibleColumns.conversionValue && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conv. Value</th>
                              )}
                              {campaignsVisibleColumns.impressionShare && (
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impr. Share</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {campaignsSummary.map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50">
                                {campaignsVisibleColumns.name && (
                                  <td className="px-4 py-2 text-sm text-left text-gray-900">{c.name}</td>
                                )}
                                {campaignsVisibleColumns.impressions && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatNumber(c.impressions)}</td>
                                )}
                                {campaignsVisibleColumns.clicks && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatNumber(c.clicks)}</td>
                                )}
                                {campaignsVisibleColumns.ctr && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{(c.ctr || 0).toFixed(2)}%</td>
                                )}
                                {campaignsVisibleColumns.cost && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatCurrency(c.cost * 1000000)}</td>
                                )}
                                {campaignsVisibleColumns.avgCpc && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatCurrency((c.cpc || 0) * 1000000)}</td>
                                )}
                                {campaignsVisibleColumns.conversions && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatNumber(Math.round(c.conversions))}</td>
                                )}
                                {campaignsVisibleColumns.conversionRate && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{(c.conversionRate || 0).toFixed(2)}%</td>
                                )}
                                {campaignsVisibleColumns.cpa && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{c.cpa ? formatCurrency(c.cpa * 1000000) : 'N/A'}</td>
                                )}
                                {campaignsVisibleColumns.conversionValue && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatCurrency((c.conversionValue || 0) * 1000000)}</td>
                                )}
                                {campaignsVisibleColumns.impressionShare && (
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">{c.impressionShare !== undefined ? `${(c.impressionShare * 100).toFixed(2)}%` : 'N/A'}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
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
          className={`w-full max-w-4xl mx-auto mb-8 transition-all duration-200 ${
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
              className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Domain Generator</h3>
                  <p className="text-gray-600 text-sm mb-3">Find the perfect domain name for your next project with AI-powered suggestions.</p>
                  <span className="text-sm text-gray-700 font-medium">Try it now →</span>
                </div>
              </div>
            </a>

            <a
              href="/web"
              className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Website Builder</h3>
                  <p className="text-gray-600 text-sm mb-3">Create beautiful websites quickly and easily with our drag-and-drop builder.</p>
                  <span className="text-sm text-gray-700 font-medium">Try it now →</span>
                </div>
              </div>
            </a>

            <a
              href="/ads"
              className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ads Generator</h3>
                  <p className="text-gray-600 text-sm mb-3">Generate high-converting ads for your campaigns with AI assistance.</p>
                  <span className="text-sm text-gray-700 font-medium">Try it now →</span>
                </div>
              </div>
            </a>

            <a
              href="/find-keywords"
              className="block bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Opportunities</h3>
                  <p className="text-gray-600 text-sm mb-3">Discover high-value keywords and analyze search trends to optimize your content.</p>
                  <span className="text-sm text-gray-700 font-medium">Try it now →</span>
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
  const defaultOrder = ['favorites', 'domain-favorites', 'published-sites', 'ads', 'feature-cards'];
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

export async function getServerSideProps(context: any) {
  const { userId } = getAuth(context.req);

  if (!userId) {
    return {
      redirect: {
        destination: '/sign-in',
        permanent: false,
      },
    };
  }

  return { props: {} };
}
