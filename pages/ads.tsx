import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { TablePagination } from "@mui/material";
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import {
  formatDateInTimezone,
  getTodayInTimezone,
  getYesterdayInTimezone,
  getLastNDaysInTimezone,
  getThisMonthInTimezone,
  getLastMonthInTimezone,
  DEFAULT_TIMEZONE,
} from "../utils/googleAdsDates";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// LocalStorage utility functions for saving/loading campaign keywords
const STORAGE_KEY = 'last-campaign-keywords';
const CAMPAIGNS_SUMMARY_KEY = 'last-campaigns-summary';
const COLUMN_VISIBILITY_KEY = 'ads-table-column-visibility';
const SORT_STATE_KEY = 'ads-table-sort-state';
const UI_ACTIVE_TAB_KEY = 'ads-ui-active-tab';
const UI_SHOW_KW_TABLE_KEY = 'ads-ui-show-kw-table';
const UI_CAMPAIGNS_COLUMNS_KEY = 'ads-ui-campaigns-columns';
const UI_DATE_FILTER_KEY = 'ads-ui-date-filter';
const UI_MAIN_PAGINATION_KEY = 'ads-ui-main-pagination';
const UI_SIMILAR_PREFS_KEY = 'ads-ui-similar-prefs';
const UI_SELECTED_INPUT_KWS_KEY = 'ads-ui-selected-input-kws';

// Column visibility type
type ColumnVisibilityState = {
  keyword: boolean;
  campaign: boolean;
  adGroup: boolean;
  matchType: boolean;
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

// Save column visibility preferences
const saveColumnVisibility = (visibility: ColumnVisibilityState) => {
  if (typeof window === 'undefined') return; // SSR safety
  
  try {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibility));
  } catch (error) {
    console.warn('Failed to save column visibility to localStorage:', error);
  }
};

// Load column visibility preferences
const loadColumnVisibility = (): ColumnVisibilityState | null => {
  if (typeof window === 'undefined') return null; // SSR safety
  
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) {
      return JSON.parse(saved) as ColumnVisibilityState;
    }
  } catch (error) {
    console.warn('Failed to load column visibility from localStorage:', error);
  }
  return null;
};

// Sort state type
type SortState = {
  sortColumn: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'impressionShare' | null;
  sortDirection: 'asc' | 'desc';
};

// Save sort state preferences
const saveSortState = (sortState: SortState) => {
  if (typeof window === 'undefined') return; // SSR safety
  
  try {
    localStorage.setItem(SORT_STATE_KEY, JSON.stringify(sortState));
  } catch (error) {
    console.warn('Failed to save sort state to localStorage:', error);
  }
};

// Load sort state preferences
const loadSortState = (): SortState | null => {
  if (typeof window === 'undefined') return null; // SSR safety
  
  try {
    const saved = localStorage.getItem(SORT_STATE_KEY);
    if (saved) {
      return JSON.parse(saved) as SortState;
    }
  } catch (error) {
    console.warn('Failed to load sort state from localStorage:', error);
  }
  return null;
};

// UI: Active tab
const saveActiveTab = (tab: 'analysis' | 'similar') => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_ACTIVE_TAB_KEY, tab); } catch {}
};
const loadActiveTab = (): 'analysis' | 'similar' | null => {
  if (typeof window === 'undefined') return null;
  try { return (localStorage.getItem(UI_ACTIVE_TAB_KEY) as any) || null; } catch { return null; }
};

// UI: KW table toggle
const saveShowKwTable = (show: boolean) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_SHOW_KW_TABLE_KEY, JSON.stringify(show)); } catch {}
};
const loadShowKwTable = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_SHOW_KW_TABLE_KEY);
    return v == null ? null : JSON.parse(v);
  } catch { return null; }
};

// UI: Campaigns summary columns
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
const saveCampaignsColumns = (cols: CampaignsColumns) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_CAMPAIGNS_COLUMNS_KEY, JSON.stringify(cols)); } catch {}
};
const loadCampaignsColumns = (): CampaignsColumns | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_CAMPAIGNS_COLUMNS_KEY);
    return v ? (JSON.parse(v) as CampaignsColumns) : null;
  } catch { return null; }
};

// UI: Date filter
type DateFilterState = { startDate: string; endDate: string; preset: string };
const saveDateFilter = (df: DateFilterState) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_DATE_FILTER_KEY, JSON.stringify(df)); } catch {}
};
const loadDateFilter = (): DateFilterState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_DATE_FILTER_KEY);
    return v ? (JSON.parse(v) as DateFilterState) : null;
  } catch { return null; }
};

// UI: Main pagination
type MainPaginationState = { page: number; itemsPerPage: number };
const saveMainPagination = (pg: MainPaginationState) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_MAIN_PAGINATION_KEY, JSON.stringify(pg)); } catch {}
};
const loadMainPagination = (): MainPaginationState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_MAIN_PAGINATION_KEY);
    return v ? (JSON.parse(v) as MainPaginationState) : null;
  } catch { return null; }
};

// UI: Similar keywords preferences
type SimilarPrefs = {
  viewMode: 'grid' | 'table';
  page: number;
  rowsPerPage: number;
  sortField: 'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'sourceKeyword' | null;
  sortDirection: 'asc' | 'desc';
  countryCode: string;
  languageCode: string;
};
const saveSimilarPrefs = (prefs: SimilarPrefs) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_SIMILAR_PREFS_KEY, JSON.stringify(prefs)); } catch {}
};
const loadSimilarPrefs = (): SimilarPrefs | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_SIMILAR_PREFS_KEY);
    return v ? (JSON.parse(v) as SimilarPrefs) : null;
  } catch { return null; }
};

// UI: Selected input keywords
const saveSelectedInputKeywords = (kws: string[]) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(UI_SELECTED_INPUT_KWS_KEY, JSON.stringify(kws)); } catch {}
};
const loadSelectedInputKeywords = (): string[] | null => {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(UI_SELECTED_INPUT_KWS_KEY);
    return v ? (JSON.parse(v) as string[]) : null;
  } catch { return null; }
};

interface SavedCampaignKeywordsData {
  campaignKeywords: CampaignKeyword[];
  selectedCampaignIds: string[];
  availableCampaigns: Array<{id: string, name: string}>;
  timestamp: number;
}

const saveCampaignKeywords = (data: Omit<SavedCampaignKeywordsData, 'timestamp'>) => {
  if (typeof window === 'undefined') return; // SSR safety
  
  try {
    const dataWithTimestamp = { ...data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.warn('Failed to save campaign keywords to localStorage:', error);
  }
};

const loadCampaignKeywords = (): SavedCampaignKeywordsData | null => {
  if (typeof window === 'undefined') return null; // SSR safety

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved) as SavedCampaignKeywordsData;
      // Only load data if it's less than 24 hours old
      const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
      return isRecent ? data : null;
    }
  } catch (error) {
    console.warn('Failed to load campaign keywords from localStorage:', error);
  }
  return null;
};

type CampaignsSummaryData = Array<{
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
}>;

interface SavedCampaignsSummaryData {
  campaignsSummary: CampaignsSummaryData;
  startDate: string;
  endDate: string;
  selectedCampaignIds: string[];
  timestamp: number;
}

const saveCampaignsSummary = (data: Omit<SavedCampaignsSummaryData, 'timestamp'>) => {
  if (typeof window === 'undefined') return; // SSR safety

  try {
    const dataWithTimestamp = { ...data, timestamp: Date.now() };
    localStorage.setItem(CAMPAIGNS_SUMMARY_KEY, JSON.stringify(dataWithTimestamp));
  } catch (error) {
    console.warn('Failed to save campaigns summary to localStorage:', error);
  }
};

const loadCampaignsSummary = (): SavedCampaignsSummaryData | null => {
  if (typeof window === 'undefined') return null; // SSR safety

  try {
    const saved = localStorage.getItem(CAMPAIGNS_SUMMARY_KEY);
    if (saved) {
      const data = JSON.parse(saved) as SavedCampaignsSummaryData;
      // Only load data if it's less than 24 hours old
      const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
      return isRecent ? data : null;
    }
  } catch (error) {
    console.warn('Failed to load campaigns summary from localStorage:', error);
  }
  return null;
};

interface CampaignKeyword {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keyword: string;
  matchType: string;
  cpcBidMicros: number;
  status: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  ctr: number;
  averageCpcMicros: number;
  conversions: number;
  conversionValueMicros: number;
  conversionRate: number;
  costPerConversionMicros: number;
  valuePerConversionMicros: number;
  impressionShare?: number;
}

interface SimilarKeyword {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  sourceKeyword?: string;
}

const AdsPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();

  const [activeTab, setActiveTab] = useState<'analysis' | 'similar'>(() => loadActiveTab() ?? 'analysis');
  const [loading, setLoading] = useState(false);
  const [fetchingKeywords, setFetchingKeywords] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [campaignKeywords, setCampaignKeywords] = useState<CampaignKeyword[]>([]);
  const [similarKeywords, setSimilarKeywords] = useState<SimilarKeyword[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{id: string, name: string}>>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [showCurrentKeywords, setShowCurrentKeywords] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Toggle to control showing keyword table and fetching keywords
  const [showKeywordsTable, setShowKeywordsTable] = useState<boolean>(() => loadShowKwTable() ?? true);
  // Campaigns summary state
  const [campaignsSummary, setCampaignsSummary] = useState<Array<{
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
  }>>([]);
  const [loadingCampaignsSummary, setLoadingCampaignsSummary] = useState(false);
  // Campaigns summary column selector state
  const [showCampaignsColumnSelector, setShowCampaignsColumnSelector] = useState(false);
  const campaignsColumnSelectorRef = useRef<HTMLDivElement>(null);
  const [campaignsVisibleColumns, setCampaignsVisibleColumns] = useState<CampaignsColumns>(() =>
    loadCampaignsColumns() ?? {
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
    }
  );
  // AI Analysis state
  const [analyzingCampaigns, setAnalyzingCampaigns] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  // Sort state - initialize from localStorage or use defaults
  const [sortColumn, setSortColumn] = useState<'impressions' | 'clicks' | 'ctr' | 'cost' | 'bid' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'impressionShare' | null>(() => {
    const saved = loadSortState();
    return saved?.sortColumn ?? null;
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = loadSortState();
    return saved?.sortDirection ?? 'desc';
  });
  const [currentPage, setCurrentPage] = useState<number>(() => loadMainPagination()?.page ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => loadMainPagination()?.itemsPerPage ?? 50);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Similar keywords view and pagination state
  const initialSimilarPrefs = loadSimilarPrefs();
  const [similarKeywordsViewMode, setSimilarKeywordsViewMode] = useState<'grid' | 'table'>(initialSimilarPrefs?.viewMode ?? 'table');
  const [similarKeywordsPage, setSimilarKeywordsPage] = useState<number>(initialSimilarPrefs?.page ?? 0);
  const [similarKeywordsRowsPerPage, setSimilarKeywordsRowsPerPage] = useState<number>(initialSimilarPrefs?.rowsPerPage ?? 50);
  const [similarKeywordsSortField, setSimilarKeywordsSortField] = useState<'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'sourceKeyword' | null>(initialSimilarPrefs?.sortField ?? null);
  const [similarKeywordsSortDirection, setSimilarKeywordsSortDirection] = useState<'asc' | 'desc'>(initialSimilarPrefs?.sortDirection ?? 'desc');
  const [similarKeywordsCountryCode, setSimilarKeywordsCountryCode] = useState<string>(initialSimilarPrefs?.countryCode ?? 'US');
  const [similarKeywordsLanguageCode, setSimilarKeywordsLanguageCode] = useState<string>(initialSimilarPrefs?.languageCode ?? 'en');
  const [selectedSimilarKeywords, setSelectedSimilarKeywords] = useState<Set<string>>(new Set());
  const [selectedInputKeywords, setSelectedInputKeywords] = useState<Set<string>>(new Set());
  
  // Default column visibility - all columns visible by default
  const defaultColumnVisibility = {
    keyword: true, // Always visible
    campaign: true,
    adGroup: true,
    matchType: true,
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
  };

  // Column visibility state - initialize from localStorage or use defaults
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibilityState>(() => {
    const saved = loadColumnVisibility();
    if (saved) {
      // Ensure keyword is always true
      return { ...saved, keyword: true };
    }
    return defaultColumnVisibility;
  });

  // Date filter state
  const loadedDateFilter = loadDateFilter();
  // Account timezone state - default to common Google Ads timezone
  const [accountTimezone, setAccountTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [timezoneLoaded, setTimezoneLoaded] = useState<boolean>(false);

  // Refs to prevent save loops during initial load
  const isInitialLoad = useRef(true);
  const hasLoadedSavedData = useRef(false);
  const lastFetchedCampaignsParams = useRef<string | null>(null);
  const lastFetchedKeywordsParams = useRef<string | null>(null);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const inputKwInitializedFromStorage = useRef(false);

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

  // Fetch account timezone on mount
  useEffect(() => {
    const fetchTimezone = async () => {
      if (!isSignedIn || !admin || !user?.emailAddresses[0]?.emailAddress) {
        return;
      }

      try {
        const response = await fetch('/api/google-ads/timezone', {
          headers: {
            'x-user-email': user.emailAddresses[0].emailAddress,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.timezone) {
            setAccountTimezone(data.timezone);
            setTimezoneLoaded(true);
            console.log('✅ Account timezone loaded:', data.timezone);
          }
        }
      } catch (error) {
        console.error('Failed to fetch account timezone:', error);
        // Continue with default timezone
        setTimezoneLoaded(true);
      }
    };

    fetchTimezone();
  }, [isSignedIn, admin, user?.emailAddresses]);

  // Initialize dates with account timezone (fallback to default if not loaded yet)
  const [startDate, setStartDate] = useState<string>(() => {
    if (loadedDateFilter?.startDate) return loadedDateFilter.startDate;
    // Use default timezone for initial state (will update when timezone loads)
    const last7Days = getLastNDaysInTimezone(7, DEFAULT_TIMEZONE);
    return last7Days.startDate;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    if (loadedDateFilter?.endDate) return loadedDateFilter.endDate;
    const last7Days = getLastNDaysInTimezone(7, DEFAULT_TIMEZONE);
    return last7Days.endDate;
  });
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>(loadedDateFilter?.preset ?? 'last7days');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Update dates when timezone loads (only if no saved dates)
  useEffect(() => {
    if (timezoneLoaded && !loadedDateFilter?.startDate) {
      const last7Days = getLastNDaysInTimezone(7, accountTimezone);
      setStartDate(last7Days.startDate);
      setEndDate(last7Days.endDate);
    }
  }, [timezoneLoaded, accountTimezone, loadedDateFilter]);

  const isPremiumUser = subsTplan === "STARTER" || subsTplan === "CREATOR";

  // Fetch user data
  const fetchUserData = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/getUser?email=${email}`);
      if (!response.ok) {
        const text = await response.text();
        console.error(`Response status: ${response.status}, text: ${text}`);
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const userData = await response.json();
      if (userData.user) {
        setDataUser({
          id: userData.user.id,
          name: userData.user.name,
          email: userData.user.email
        });      
        setCredits(userData.user.credits);
        setAdmin(userData.user.admin);
        setSubsTplan(userData.user.subs_tplan);
        setSubsCancel(userData.user.subs_cancel);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  }, [setDataUser, setCredits, setAdmin, setSubsTplan, setSubsCancel]);

  const initPageData = useCallback(async () => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0].emailAddress;
      if (email) {
        try {
          await fetchUserData(email);
        } catch (error) {
          console.error("Error initializing page data:", error);
        }
      }
    } else if (isLoaded && !user) {
      setSubsTplan(null);
      setSubsCancel(null);
      setCredits(null);
      setDataUser({
        id: '0',
        name: 'anonymous',
        email: 'anonymous@anonymous.com'
      });
      setAdmin(false);
    }
  }, [isLoaded, user, fetchUserData]);

  useEffect(() => {
    initPageData();
  }, [isSignedIn, user, initPageData]);

  // Fetch available campaigns when admin is loaded
  useEffect(() => {
    if (isLoaded && isSignedIn && admin && availableCampaigns.length === 0) {
      fetchAvailableCampaigns();
    }
  }, [isLoaded, isSignedIn, admin]);

  // Reset to page 1 when campaign keywords change
  useEffect(() => {
    setCurrentPage(1);
  }, [campaignKeywords.length]);

  // Load saved campaign keywords and summary on component mount
  useEffect(() => {
    const savedKeywordsData = loadCampaignKeywords();
    if (savedKeywordsData) {
      setCampaignKeywords(savedKeywordsData.campaignKeywords);
      setSelectedCampaignIds(savedKeywordsData.selectedCampaignIds);
      setAvailableCampaigns(savedKeywordsData.availableCampaigns);
      setShowCurrentKeywords(true);
      hasLoadedSavedData.current = true;
    }

    // Load campaigns summary if it matches current date range
    // (campaigns summary is filtered client-side by selectedCampaignIds)
    const savedSummaryData = loadCampaignsSummary();
    if (savedSummaryData &&
        savedSummaryData.startDate === startDate &&
        savedSummaryData.endDate === endDate) {
      setCampaignsSummary(savedSummaryData.campaignsSummary);
    }

    isInitialLoad.current = false;
  }, [startDate, endDate, selectedCampaignIds]);

  // Initialize selected input keywords when campaign keywords change
  useEffect(() => {
    if (campaignKeywords.length > 0) {
      const uniqueKeywords = Array.from(new Set(campaignKeywords.map(k => k.keyword)));
      if (!inputKwInitializedFromStorage.current) {
        const saved = loadSelectedInputKeywords();
        if (saved && saved.length > 0) {
          const allowed = new Set(uniqueKeywords);
          const intersect = saved.filter(k => allowed.has(k));
          setSelectedInputKeywords(new Set(intersect));
          inputKwInitializedFromStorage.current = true;
          return;
        }
        inputKwInitializedFromStorage.current = true;
      }
      setSelectedInputKeywords(new Set(uniqueKeywords));
    } else {
      setSelectedInputKeywords(new Set());
    }
  }, [campaignKeywords]);

  // Auto-select all campaigns when they become available (if no saved data was loaded)
  useEffect(() => {
    if (availableCampaigns.length > 0 && !hasLoadedSavedData.current && selectedCampaignIds.length === 0) {
      setSelectedCampaignIds(availableCampaigns.map(c => c.id));
    }
  }, [availableCampaigns, selectedCampaignIds.length]);

  // Close column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnSelector]);

  // Close Campaigns column selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (campaignsColumnSelectorRef.current && !campaignsColumnSelectorRef.current.contains(event.target as Node)) {
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


  const fetchCampaignKeywords = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) {
      toast.error('Please sign in to analyze campaigns');
      return;
    }

    if (!admin) {
      toast.error('Admin access required');
      return;
    }

    // If we have selected campaigns, use them; otherwise fetch all
    const params = new URLSearchParams();
    if (selectedCampaignIds.length > 0) {
      params.append('campaignIds', selectedCampaignIds.join(','));
    }
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    // Reset cache for manual fetch
    lastFetchedKeywordsParams.current = null;

    setFetchingKeywords(true);
    try {
      const response = await fetch(`/api/google-ads/get-campaign-keywords?${params.toString()}`, {
        headers: {
          'x-user-email': user.emailAddresses[0].emailAddress
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const keywords = data.keywords || [];
        setCampaignKeywords(keywords);
        setShowCurrentKeywords(true);
        
        // Extract unique campaigns from response for the selector
        const uniqueCampaigns = Array.from(new Map(
          keywords.map((kw: CampaignKeyword) => [kw.campaignId, { id: kw.campaignId, name: kw.campaignName }]) || []
        ).values()) as Array<{id: string, name: string}>;
        
        // Only update available campaigns if we don't have them yet or if we fetched all
        const campaignsToSave = (availableCampaigns.length === 0 || selectedCampaignIds.length === 0)
          ? uniqueCampaigns
          : availableCampaigns;

        if (availableCampaigns.length === 0 || selectedCampaignIds.length === 0) {
          setAvailableCampaigns(uniqueCampaigns);
        }
        
        // Save to localStorage after successful fetch
        saveCampaignKeywords({
          campaignKeywords: keywords,
          selectedCampaignIds,
          availableCampaigns: campaignsToSave
        });

        // Reset the hasLoadedSavedData flag after first manual fetch
        if (hasLoadedSavedData.current) {
          hasLoadedSavedData.current = false;
        }

        toast.success(`Found ${data.totalKeywords} keywords from ${uniqueCampaigns.length} campaign${uniqueCampaigns.length !== 1 ? 's' : ''}`);
      } else {
        toast.error(data.error || 'Failed to fetch keywords');
      }
    } catch (error) {
      console.error('Error fetching keywords:', error);
      toast.error('Failed to fetch keywords from campaigns');
    } finally {
      setFetchingKeywords(false);
    }
  };

  // Fetch campaigns summary (campaign-level metrics)
  const fetchCampaignsSummary = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) {
      toast.error('Please sign in to view campaign summaries');
      return;
    }
    if (!admin) {
      toast.error('Admin access required');
      return;
    }

    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);

    // Reset cache for manual fetch
    lastFetchedCampaignsParams.current = null;

    setLoadingCampaignsSummary(true);
    try {
      const response = await fetch(`/api/google-ads/metrics?${params.toString()}`, {
        headers: { 'x-user-email': user.emailAddresses[0].emailAddress }
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch campaign metrics');
      }
      let campaigns = (data.metrics?.campaigns || []) as typeof campaignsSummary;
      // Client-side filter by selected campaigns if any are selected
      if (selectedCampaignIds.length > 0) {
        const selectedSet = new Set(selectedCampaignIds);
        campaigns = campaigns.filter(c => selectedSet.has(String(c.id)));
      }
      setCampaignsSummary(campaigns);

      // Save to localStorage after successful fetch
      saveCampaignsSummary({
        campaignsSummary: campaigns,
        startDate,
        endDate,
        selectedCampaignIds
      });
    } catch (e) {
      console.error('Error fetching campaigns summary:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to load campaign summary');
    } finally {
      setLoadingCampaignsSummary(false);
    }
  };

  const analyzeCampaignsWithAI = async () => {
    if (!user?.emailAddresses[0]?.emailAddress) {
      toast.error('Please sign in to analyze campaigns');
      return;
    }

    if (!admin) {
      toast.error('Admin access required');
      return;
    }

    if (campaignsSummary.length === 0) {
      toast.error('Please fetch campaign data first');
      return;
    }

    setAnalyzingCampaigns(true);
    setAiAnalysis('');
    setShowAiAnalysis(true);

    try {
      // Collect campaign data - only include visible columns
      const campaignData = {
        campaigns: campaignsSummary.map(c => {
          const campaignObj: any = {};

          // Always include name and status for context
          campaignObj.name = c.name;
          campaignObj.status = c.status;

          // Only include metrics from visible columns
          if (campaignsVisibleColumns.impressions) campaignObj.impressions = c.impressions;
          if (campaignsVisibleColumns.clicks) campaignObj.clicks = c.clicks;
          if (campaignsVisibleColumns.ctr) campaignObj.ctr = c.ctr;
          if (campaignsVisibleColumns.cost) campaignObj.cost = c.cost;
          if (campaignsVisibleColumns.avgCpc) campaignObj.avgCpc = c.cpc;
          if (campaignsVisibleColumns.conversions) campaignObj.conversions = c.conversions;
          if (campaignsVisibleColumns.conversionRate) campaignObj.conversionRate = c.conversionRate;
          if (campaignsVisibleColumns.cpa) campaignObj.cpa = c.cpa;
          if (campaignsVisibleColumns.conversionValue) campaignObj.conversionValue = c.conversionValue;
          if (campaignsVisibleColumns.impressionShare) campaignObj.impressionShare = c.impressionShare;

          return campaignObj;
        }),
        keywords: getSortedKeywords().slice(0, 20).map(k => {
          const keywordObj: any = {
            keyword: k.keyword,
            campaign: k.campaignName
          };

          // Only include metrics that are visible in campaign columns
          if (campaignsVisibleColumns.impressions) keywordObj.impressions = k.impressions;
          if (campaignsVisibleColumns.clicks) keywordObj.clicks = k.clicks;
          if (campaignsVisibleColumns.ctr) keywordObj.ctr = k.ctr;
          if (campaignsVisibleColumns.cost) keywordObj.cost = k.costMicros;
          if (campaignsVisibleColumns.avgCpc) keywordObj.avgCpc = k.averageCpcMicros;
          if (campaignsVisibleColumns.conversions) keywordObj.conversions = k.conversions;
          if (campaignsVisibleColumns.conversionRate) keywordObj.conversionRate = k.conversionRate;
          if (campaignsVisibleColumns.cpa) keywordObj.cpa = k.costPerConversionMicros;
          if (campaignsVisibleColumns.conversionValue) keywordObj.conversionValue = k.conversionValueMicros;

          return keywordObj;
        }),
        dateRange: {
          start: startDate,
          end: endDate
        }
      };

      // Determine which analysis sections to include based on visible data
      const hasConversionData = campaignsVisibleColumns.conversions ||
                               campaignsVisibleColumns.conversionRate ||
                               campaignsVisibleColumns.cpa ||
                               campaignsVisibleColumns.conversionValue;

      const analysisSections = [
        "1. **Performance Overview**: Key insights about overall campaign performance",
        "2. **Top Performing Campaigns**: Which campaigns are doing well and why",
        "3. **Underperforming Areas**: Campaigns or keywords that need attention",
        "4. **Budget Optimization**: Suggestions for budget allocation",
        "5. **Keyword Strategy**: Recommendations for keyword management, bids, and targeting"
      ];

      if (hasConversionData) {
        analysisSections.push("6. **Conversion Optimization**: Ways to improve conversion rates");
        analysisSections.push("7. **Action Items**: Specific, prioritized recommendations with expected impact");
      } else {
        analysisSections.push("6. **Action Items**: Specific, prioritized recommendations with expected impact");
        analysisSections.push("**Note**: Conversion data is not visible in your current view. Focus analysis on available metrics like impressions, clicks, CTR, and cost efficiency.");
      }

      const prompt = `You are an expert Google Ads specialist with 10+ years of experience optimizing campaigns for various industries.

Analyze this Google Ads campaign data and provide actionable recommendations to improve performance. IMPORTANT: The data shown includes ONLY the metrics columns that are currently visible in the user's interface. Do NOT mention or analyze any metrics that are not present in the data provided.

CAMPAIGN DATA:
${JSON.stringify(campaignData, null, 2)}

Please provide a comprehensive analysis including:

${analysisSections.join('\n')}

Be specific with numbers and percentages. Focus on actionable insights that can drive better ROI. If conversion data is not available, do not discuss conversions, CPA, or ROI optimization.`;

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ptemp: 0.7, ptop: 1 }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();

      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).text ?? "";
            setAiAnalysis(prev => prev + text);
          } catch (e) {
            console.error(e);
          }
        }
      };

      const parser = createParser(onParse);
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
      }

      toast.success('AI analysis completed!');
    } catch (error) {
      console.error('Error analyzing campaigns with AI:', error);
      toast.error('Failed to analyze campaigns with AI');
      setShowAiAnalysis(false);
    } finally {
      setAnalyzingCampaigns(false);
    }
  };

  // Initial fetch to get list of campaigns
  const fetchAvailableCampaigns = async () => {
    if (!user?.emailAddresses[0]?.emailAddress || !admin) return;

    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await fetch(`/api/google-ads/get-campaign-keywords?${params.toString()}`, {
        headers: {
          'x-user-email': user.emailAddresses[0].emailAddress
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Extract unique campaigns
        const uniqueCampaigns = Array.from(new Map(
          data.keywords?.map((kw: CampaignKeyword) => [kw.campaignId, { id: kw.campaignId, name: kw.campaignName }]) || []
        ).values()) as Array<{id: string, name: string}>;
        
        setAvailableCampaigns(uniqueCampaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  // Auto-fetch campaigns summary when date range or selection changes (and admin)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !admin) return;

    const paramsKey = `${startDate}-${endDate}-${selectedCampaignIds.sort().join(',')}`;

    // Skip if we already fetched for these exact parameters
    if (lastFetchedCampaignsParams.current === paramsKey) {
      return;
    }

    // Skip automatic fetch on initial mount if we loaded saved data from localStorage
    if (hasLoadedSavedData.current && lastFetchedCampaignsParams.current === null) {
      lastFetchedCampaignsParams.current = paramsKey;
      return;
    }

    fetchCampaignsSummary();
    lastFetchedCampaignsParams.current = paramsKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedCampaignIds, isLoaded, isSignedIn, admin]);

  // Auto-fetch keywords when date range or selected campaigns change
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !admin || !showKeywordsTable) return;

    const paramsKey = `${startDate}-${endDate}-${selectedCampaignIds.sort().join(',')}`;

    // Skip if we already fetched for these exact parameters
    if (lastFetchedKeywordsParams.current === paramsKey) {
      return;
    }

    // Skip automatic fetch on initial mount if we loaded saved data from localStorage
    if (hasLoadedSavedData.current && lastFetchedKeywordsParams.current === null) {
      lastFetchedKeywordsParams.current = paramsKey;
      return;
    }

    fetchCampaignKeywords();
    lastFetchedKeywordsParams.current = paramsKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedCampaignIds, isLoaded, isSignedIn, admin, showKeywordsTable]);

  const findSimilarKeywords = async () => {
    if (campaignKeywords.length === 0) {
      toast.error('Please fetch campaign keywords first');
      return;
    }

    if (!user?.emailAddresses[0]?.emailAddress) {
      toast.error('Please sign in');
      return;
    }

    setFindingSimilar(true);
    setSimilarKeywords([]);
    setSelectedSimilarKeywords(new Set()); // Clear selections when finding new keywords

    try {
      // Get selected input keywords
      const uniqueKeywords = Array.from(selectedInputKeywords);
      
      // Process in batches to avoid overwhelming the API (matches backend batch size of 5)
      const batchSize = 5;
      let allSimilar: SimilarKeyword[] = [];
      const failedKeywords: string[] = [];
      
      for (let i = 0; i < uniqueKeywords.length; i += batchSize) {
        const batch = uniqueKeywords.slice(i, i + batchSize);
        
        try {
          const response = await fetch('/api/google-ads/find-similar-keywords', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-email': user.emailAddresses[0].emailAddress
            },
            body: JSON.stringify({
              keywords: batch,
              countryCode: similarKeywordsCountryCode,
              languageCode: similarKeywordsLanguageCode,
              excludeExisting: Array.from(new Set(campaignKeywords.map(k => k.keyword))), // Exclude existing campaign keywords
            })
          });

          const data = await response.json();
          
          if (response.ok && data.success && data.similarKeywords) {
            allSimilar = [...allSimilar, ...data.similarKeywords];
            setSimilarKeywords([...allSimilar]);
          } else {
            // Track failed keywords in this batch
            failedKeywords.push(...batch);
            console.warn(`Failed to find similar keywords for batch starting at index ${i}:`, data.error || 'Unknown error');
          }
        } catch (error) {
          // Track failed keywords in this batch
          failedKeywords.push(...batch);
          console.error(`Error processing batch starting at index ${i}:`, error);
        }
        
        // Update progress with detailed information
        const processedSoFar = Math.min(i + batchSize, uniqueKeywords.length);
        const totalKeywords = uniqueKeywords.length;
        const progressPercent = Math.round((processedSoFar / totalKeywords) * 100);
        
        if (processedSoFar < totalKeywords) {
          toast.loading(
            `Processing similar keywords... ${processedSoFar} of ${totalKeywords} (${progressPercent}%)`, 
            { id: 'progress', duration: Infinity }
          );
        }
      }
      
      toast.dismiss('progress');
      
      // Remove duplicates and sort by search volume
      const uniqueSimilar = Array.from(
        new Map(allSimilar.map(k => [k.keyword.toLowerCase(), k])).values()
      ).sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));
      
      setSimilarKeywords(uniqueSimilar);
      setShowSuggestions(true);
      
      // Show appropriate success/warning message
      if (failedKeywords.length > 0 && uniqueSimilar.length > 0) {
        toast.success(`Found ${uniqueSimilar.length} similar keywords (${failedKeywords.length} keyword${failedKeywords.length !== 1 ? 's' : ''} failed to process)`, { duration: 5000 });
      } else if (failedKeywords.length > 0 && uniqueSimilar.length === 0) {
        toast.error(`Failed to find similar keywords. ${failedKeywords.length} keyword${failedKeywords.length !== 1 ? 's' : ''} could not be processed.`);
      } else {
        toast.success(`Found ${uniqueSimilar.length} similar keywords to expand your reach!`);
      }
    } catch (error) {
      console.error('Error finding similar keywords:', error);
      toast.error('Failed to find similar keywords');
    } finally {
      setFindingSimilar(false);
    }
  };

  const exportKeywords = (format: 'csv' | 'json', selectedOnly: boolean = false) => {
    const keywordsToExport = selectedOnly && selectedSimilarKeywords.size > 0
      ? similarKeywords.filter(k => selectedSimilarKeywords.has(k.keyword))
      : similarKeywords;

    if (keywordsToExport.length === 0) {
      toast.error('No keywords to export');
      return;
    }

    if (format === 'csv') {
      const headers = ['Keyword', 'Search Volume', 'Competition', 'Min CPC', 'Max CPC', 'Source Keyword'];
      const rows = keywordsToExport.map(k => [
        k.keyword,
        k.searchVolume.toString(),
        k.competition,
        k.lowTopPageBidMicros ? `$${(k.lowTopPageBidMicros / 1000000).toFixed(2)}` : 'N/A',
        k.highTopPageBidMicros ? `$${(k.highTopPageBidMicros / 1000000).toFixed(2)}` : 'N/A',
        k.sourceKeyword || ''
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `similar-keywords${selectedOnly ? '-selected' : ''}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(keywordsToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `similar-keywords${selectedOnly ? '-selected' : ''}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast.success(`Exported ${keywordsToExport.length} keywords as ${format.toUpperCase()}`);
  };

  const copyKeywordsToClipboard = async (selectedOnly: boolean = false) => {
    const keywordsToCopy = selectedOnly && selectedSimilarKeywords.size > 0
      ? similarKeywords.filter(k => selectedSimilarKeywords.has(k.keyword))
      : similarKeywords;

    if (keywordsToCopy.length === 0) {
      toast.error('No keywords to copy');
      return;
    }

    const keywordList = keywordsToCopy.map(k => k.keyword).join('\n');

    try {
      await navigator.clipboard.writeText(keywordList);
      toast.success(`Copied ${keywordsToCopy.length} keyword${keywordsToCopy.length !== 1 ? 's' : ''} to clipboard`);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = keywordList;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success(`Copied ${keywordsToCopy.length} keyword${keywordsToCopy.length !== 1 ? 's' : ''} to clipboard`);
      } catch (fallbackError) {
        toast.error('Failed to copy keywords to clipboard');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSimilarKeywordSelect = (keyword: string, selected: boolean) => {
    setSelectedSimilarKeywords(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(keyword);
      } else {
        newSet.delete(keyword);
      }
      return newSet;
    });
  };

  const handleSelectAllSimilarKeywords = (selected: boolean) => {
    if (selected) {
      const allKeywords = new Set(getPaginatedSimilarKeywords().map(k => k.keyword));
      setSelectedSimilarKeywords(prev => new Set([...Array.from(prev), ...Array.from(allKeywords)]));
    } else {
      const currentPageKeywords = new Set(getPaginatedSimilarKeywords().map(k => k.keyword));
      setSelectedSimilarKeywords(prev => {
        const newSet = new Set(prev);
        Array.from(currentPageKeywords).forEach(keyword => newSet.delete(keyword));
        return newSet;
      });
    }
  };

  const isAllCurrentPageSelected = () => {
    const currentPageKeywords = getPaginatedSimilarKeywords();
    return currentPageKeywords.length > 0 && Array.from(selectedSimilarKeywords).every(keyword => currentPageKeywords.some(k => k.keyword === keyword));
  };

  const isAnyCurrentPageSelected = () => {
    const currentPageKeywords = getPaginatedSimilarKeywords();
    return currentPageKeywords.some(k => selectedSimilarKeywords.has(k.keyword));
  };

  // Date filter helper functions - uses account timezone
  const handleDatePresetChange = (preset: string) => {
    const tz = timezoneLoaded ? accountTimezone : DEFAULT_TIMEZONE;
    let startDateStr: string;
    let endDateStr: string;

    switch (preset) {
      case 'today':
        startDateStr = getTodayInTimezone(tz);
        endDateStr = getTodayInTimezone(tz);
        break;
      case 'yesterday':
        startDateStr = getYesterdayInTimezone(tz);
        endDateStr = getYesterdayInTimezone(tz);
        break;
      case 'last7days':
        ({ startDate: startDateStr, endDate: endDateStr } = getLastNDaysInTimezone(7, tz));
        break;
      case 'last30days':
        ({ startDate: startDateStr, endDate: endDateStr } = getLastNDaysInTimezone(30, tz));
        break;
      case 'last90days':
        ({ startDate: startDateStr, endDate: endDateStr } = getLastNDaysInTimezone(90, tz));
        break;
      case 'thismonth':
        ({ startDate: startDateStr, endDate: endDateStr } = getThisMonthInTimezone(tz));
        break;
      case 'lastmonth':
        ({ startDate: startDateStr, endDate: endDateStr } = getLastMonthInTimezone(tz));
        break;
      default:
        return;
    }

    setStartDate(startDateStr);
    setEndDate(endDateStr);
    setSelectedDatePreset(preset);
  };

  const datePresets = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 days' },
    { value: 'last30days', label: 'Last 30 days' },
    { value: 'last90days', label: 'Last 90 days' },
    { value: 'thismonth', label: 'This month' },
    { value: 'lastmonth', label: 'Last month' },
  ];

  const formatCurrency = (micros: number) => {
    return `$${(micros / 1000000).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Match type mapping from Google Ads API enum values to readable strings
  const formatMatchType = (matchType: string | number) => {
    const matchTypeMap: Record<string, string> = {
      '2': 'EXACT',
      '3': 'PHRASE',
      '4': 'BROAD',
      'EXACT': 'EXACT',
      'PHRASE': 'PHRASE',
      'BROAD': 'BROAD'
    };
    return matchTypeMap[String(matchType)] || String(matchType);
  };

  const handleSort = (column: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'impressionShare') => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortedKeywords = () => {
    if (!sortColumn) return campaignKeywords;

    const sorted = [...campaignKeywords].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortColumn) {
        case 'impressions':
          aValue = a.impressions;
          bValue = b.impressions;
          break;
        case 'clicks':
          aValue = a.clicks;
          bValue = b.clicks;
          break;
        case 'ctr':
          aValue = a.ctr;
          bValue = b.ctr;
          break;
        case 'cost':
          aValue = a.costMicros;
          bValue = b.costMicros;
          break;
        case 'avgCpc':
          aValue = a.averageCpcMicros;
          bValue = b.averageCpcMicros;
          break;
        case 'conversions':
          aValue = a.conversions;
          bValue = b.conversions;
          break;
        case 'conversionRate':
          aValue = a.conversionRate;
          bValue = b.conversionRate;
          break;
        case 'cpa':
          aValue = a.costPerConversionMicros;
          bValue = b.costPerConversionMicros;
          break;
        case 'conversionValue':
          aValue = a.conversionValueMicros;
          bValue = b.conversionValueMicros;
          break;
        case 'impressionShare':
          aValue = a.impressionShare || 0;
          bValue = b.impressionShare || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return sorted;
  };

  const SortArrow = ({ column }: { column: 'impressions' | 'clicks' | 'ctr' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'impressionShare' }) => {
    if (sortColumn !== column) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="ml-1 text-blue-600">↑</span>
    ) : (
      <span className="ml-1 text-blue-600">↓</span>
    );
  };

  const getPaginatedKeywords = () => {
    const sorted = getSortedKeywords();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getSortedKeywords().length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, getSortedKeywords().length);
  const totalItems = getSortedKeywords().length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Similar keywords sorting and pagination
  const handleSimilarKeywordsSort = (field: 'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'sourceKeyword') => {
    if (similarKeywordsSortField === field) {
      // Toggle direction if clicking the same column
      setSimilarKeywordsSortDirection(similarKeywordsSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSimilarKeywordsSortField(field);
      setSimilarKeywordsSortDirection('desc');
    }
    setSimilarKeywordsPage(0); // Reset to first page when sorting
  };

  const getSortedSimilarKeywords = () => {
    if (!similarKeywordsSortField || !similarKeywordsSortDirection) {
      return similarKeywords;
    }

    return [...similarKeywords].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (similarKeywordsSortField) {
        case 'keyword':
          aValue = a.keyword.toLowerCase();
          bValue = b.keyword.toLowerCase();
          if (aValue < bValue) return similarKeywordsSortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return similarKeywordsSortDirection === 'asc' ? 1 : -1;
          return 0;
        case 'searchVolume':
          aValue = a.searchVolume || 0;
          bValue = b.searchVolume || 0;
          break;
        case 'competition':
          // Convert competition to numeric for sorting (HIGH=3, MEDIUM=2, LOW=1, UNKNOWN=0)
          const compMap: Record<string, number> = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0 };
          aValue = compMap[a.competition] || (a.competitionIndex || 0);
          bValue = compMap[b.competition] || (b.competitionIndex || 0);
          break;
        case 'minCpc':
          aValue = a.lowTopPageBidMicros || 0;
          bValue = b.lowTopPageBidMicros || 0;
          break;
        case 'maxCpc':
          aValue = a.highTopPageBidMicros || 0;
          bValue = b.highTopPageBidMicros || 0;
          break;
        case 'sourceKeyword':
          aValue = (a.sourceKeyword || '').toLowerCase();
          bValue = (b.sourceKeyword || '').toLowerCase();
          if (aValue < bValue) return similarKeywordsSortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return similarKeywordsSortDirection === 'asc' ? 1 : -1;
          return 0;
        default:
          return 0;
      }

      // Numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (similarKeywordsSortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      return 0;
    });
  };

  const getPaginatedSimilarKeywords = () => {
    const sorted = getSortedSimilarKeywords();
    const startIndex = similarKeywordsPage * similarKeywordsRowsPerPage;
    const endIndex = startIndex + similarKeywordsRowsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const SimilarKeywordsSortArrow = ({ column }: { column: 'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'sourceKeyword' }) => {
    if (similarKeywordsSortField !== column) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return similarKeywordsSortDirection === 'asc' ? (
      <span className="ml-1 text-blue-600">↑</span>
    ) : (
      <span className="ml-1 text-blue-600">↓</span>
    );
  };

  const handleSimilarKeywordsChangePage = (
    event: unknown,
    newPage: number,
  ) => {
    setSimilarKeywordsPage(newPage);
  };

  const handleSimilarKeywordsChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setSimilarKeywordsRowsPerPage(parseInt(event.target.value, 10));
    setSimilarKeywordsPage(0);
  };

  const handleColumnVisibilityToggle = (column: keyof typeof visibleColumns) => {
    // Prevent toggling keyword column
    if (column === 'keyword') return;
    
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // Auto-save column visibility to localStorage when it changes (skip initial load)
  useEffect(() => {
    // Skip save on initial mount to avoid overwriting with defaults
    if (isInitialLoad.current) {
      return;
    }
    
    // Save whenever visibleColumns changes
    saveColumnVisibility(visibleColumns);
  }, [visibleColumns]);

  // Auto-save sort state to localStorage when it changes (skip initial load)
  useEffect(() => {
    // Skip save on initial mount to avoid overwriting with defaults
    if (isInitialLoad.current) {
      return;
    }
    
    // Save whenever sort state changes
    saveSortState({
      sortColumn,
      sortDirection
    });
  }, [sortColumn, sortDirection]);

  // Persist active tab
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveActiveTab(activeTab);
  }, [activeTab]);

  // Persist KW table toggle
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveShowKwTable(showKeywordsTable);
  }, [showKeywordsTable]);

  // Persist campaigns summary columns
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveCampaignsColumns(campaignsVisibleColumns);
  }, [campaignsVisibleColumns]);

  // Persist date filter
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveDateFilter({ startDate, endDate, preset: selectedDatePreset });
  }, [startDate, endDate, selectedDatePreset]);

  // Persist main pagination
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveMainPagination({ page: currentPage, itemsPerPage });
  }, [currentPage, itemsPerPage]);

  // Persist similar keywords preferences
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveSimilarPrefs({
      viewMode: similarKeywordsViewMode,
      page: similarKeywordsPage,
      rowsPerPage: similarKeywordsRowsPerPage,
      sortField: similarKeywordsSortField,
      sortDirection: similarKeywordsSortDirection,
      countryCode: similarKeywordsCountryCode,
      languageCode: similarKeywordsLanguageCode,
    });
  }, [
    similarKeywordsViewMode,
    similarKeywordsPage,
    similarKeywordsRowsPerPage,
    similarKeywordsSortField,
    similarKeywordsSortDirection,
    similarKeywordsCountryCode,
    similarKeywordsLanguageCode,
  ]);

  // Persist selected input keywords
  useEffect(() => {
    if (isInitialLoad.current) return;
    saveSelectedInputKeywords(Array.from(selectedInputKeywords));
  }, [selectedInputKeywords]);

  return (
    <div className="flex w-full flex-col items-center justify-center py-2 min-h-screen bg-white">
      <Head>
        <title>Ads Pilot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-2 sm:mt-2">
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          {/* Minimal Back Button */}
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 text-xl font-light hover:bg-gray-100 rounded px-1 py-0.5 transition-colors"
          >
            ‹
          </button>

          {/* Basic Context Title */}
          <span className="text-gray-900 font-medium">Ads Pilot</span>
        </div>



        {/* Tab Navigation */}
        <div className="w-full max-w-4xl mx-auto mb-6">
          <div className="bg-gray-100 rounded-lg p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'analysis'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Campaign Analysis
              </button>
              <button
                onClick={() => setActiveTab('similar')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'similar'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Similar Keywords
                {campaignKeywords.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                    {campaignKeywords.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Analysis Tab */}
        {activeTab === 'analysis' && (
          <>
            {/* Campaigns Summary */}
            <div className="w-full mb-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                {/* Campaign Selector inside Campaigns Summary (moved above Date Range) */}
                {availableCampaigns.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center flex-wrap gap-2">
                      <div className="flex flex-wrap gap-2">
                        {availableCampaigns.map((campaign) => (
                          <label
                            key={campaign.id}
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-gray-200 hover:border-blue-300 cursor-pointer transition-all bg-gray-50 hover:bg-blue-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCampaignIds.includes(campaign.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCampaignIds([...selectedCampaignIds, campaign.id]);
                                } else {
                                  setSelectedCampaignIds(selectedCampaignIds.filter(id => id !== campaign.id));
                                }
                              }}
                              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700 font-medium">{campaign.name}</span>
                          </label>
                        ))}
                      </div>
                      <span className="hidden sm:block h-6 w-px bg-gray-200 mx-1" />
                      <label className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showKeywordsTable}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setShowKeywordsTable(next);
                            if (next && campaignKeywords.length === 0 && admin && isLoaded && isSignedIn) {
                              fetchCampaignKeywords();
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span>KW table</span>
                      </label>
                      
                    </div>
                    {!admin && (
                      <p className="text-xs text-gray-500 text-center mt-2">Admin access required</p>
                    )}
                  </div>
                )}
                {/* Single row with Date Filter, Title, and Controls */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Date Filter on the left */}
                  <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">Date Range</span>
                      <div className="flex flex-wrap gap-2">
                        {datePresets.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => handleDatePresetChange(preset.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              selectedDatePreset === preset.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              setSelectedDatePreset('custom');
                            }}
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                              setSelectedDatePreset('custom');
                            }}
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Title and Controls on the right */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {/* AI Analysis Button */}
                      <button
                        onClick={analyzeCampaignsWithAI}
                        disabled={analyzingCampaigns}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span>{analyzingCampaigns ? 'Analyzing...' : 'AI Analysis'}</span>
                      </button>

                      {/* Column Selector */}
                      <div className="flex justify-end relative" ref={campaignsColumnSelectorRef}>
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
                        
                        {showCampaignsColumnSelector && (
                          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 z-20 min-w-[220px]">
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
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                        )}
                      </div>
                      
                    </div>
                  </div>
                </div>
                
                {loadingCampaignsSummary ? (
                  <div className="py-6 flex justify-center"><LoadingDots color="black" style="small" /></div>
                ) : campaignsSummary.length === 0 ? (
                  <p className="text-sm text-gray-600">No campaign data for the selected range.</p>
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
              </div>
            </div>

          </>
        )}

        {/* AI Analysis Results Modal */}
        <Dialog
          fullScreen
          open={showAiAnalysis && !!aiAnalysis}
          onClose={() => setShowAiAnalysis(false)}
          TransitionComponent={Transition}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white border-b border-gray-200">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">AI Campaign Analysis</h2>
              <p className="text-lg text-gray-600 mt-1">Expert Google Ads optimization recommendations</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiAnalysis);
                  toast.success('Analysis copied to clipboard!');
                }}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Analysis
              </button>
              <button
                onClick={() => setShowAiAnalysis(false)}
                className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden bg-gray-50">
            <div className="h-full max-w-6xl mx-auto p-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-full overflow-y-auto">
                <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:text-gray-700 prose-li:text-gray-700 prose-li:leading-relaxed">
                  <div className="whitespace-pre-wrap leading-relaxed font-sans">
                    {aiAnalysis}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog>

        {/* Similar Keywords Tab */}
        {activeTab === 'similar' && (
          <div className="w-full max-w-4xl mx-auto mb-8">
            {campaignKeywords.length > 0 ? (
              <div className="space-y-6">
                {/* Input Keywords Selection */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Select which keywords from your campaigns will be used ({selectedInputKeywords.size} unique keywords selected from {campaignKeywords.length} total)</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedInputKeywords(new Set(Array.from(new Set(campaignKeywords.map(k => k.keyword)))))}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedInputKeywords(new Set())}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Array.from(new Set(campaignKeywords.map(k => k.keyword))).map((keyword) => (
                        <label
                          key={keyword}
                          className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedInputKeywords.has(keyword)}
                            onChange={(e) => {
                              const newSet = new Set(selectedInputKeywords);
                              if (e.target.checked) {
                                newSet.add(keyword);
                              } else {
                                newSet.delete(keyword);
                              }
                              setSelectedInputKeywords(newSet);
                            }}
                            className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700 truncate" title={keyword}>{keyword}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Location Settings */}
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex gap-3">
                        <select
                          value={similarKeywordsCountryCode}
                          onChange={(e) => setSimilarKeywordsCountryCode(e.target.value)}
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
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
                        <select
                          value={similarKeywordsLanguageCode}
                          onChange={(e) => setSimilarKeywordsLanguageCode(e.target.value)}
                          className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
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

                    {/* Find Button */}
                    <button
                      onClick={findSimilarKeywords}
                      disabled={findingSimilar || selectedInputKeywords.size === 0}
                      className="bg-black text-white rounded-lg px-6 py-3 hover:bg-gray-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {findingSimilar ? (
                        <>
                          <LoadingDots color="white" style="small" />
                          <span>Finding Similar Keywords...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                          <span>Find Similar Keywords ({selectedInputKeywords.size})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaign Data</h3>
                <p className="text-gray-600 mb-4">Switch to the Campaign Analysis tab to fetch your campaign keywords first.</p>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Go to Campaign Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Current Keywords - Analysis Tab */}
        {activeTab === 'analysis' && showKeywordsTable && showCurrentKeywords && campaignKeywords.length > 0 && (
          <div className="w-full mb-8">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
              {/* Column Selector */}
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                <div className="flex justify-end relative" ref={columnSelectorRef}>
                <button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  <span>Columns</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showColumnSelector && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border-2 border-gray-200 p-4 z-20 min-w-[220px]">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">Show/Hide Columns</h3>
                        <button
                          onClick={() => setShowColumnSelector(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {Object.entries(visibleColumns).map(([key, value]) => (
                          <label
                            key={key}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={value}
                              onChange={() => handleColumnVisibilityToggle(key as keyof typeof visibleColumns)}
                              disabled={key === 'keyword'} // Keyword column always visible
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={`text-sm text-gray-700 ${key === 'keyword' ? 'font-semibold' : ''}`}>
                              {key === 'keyword' ? 'Keyword' :
                               key === 'adGroup' ? 'Ad Group' :
                               key === 'matchType' ? 'Match Type' :
                               key === 'avgCpc' ? 'Avg CPC' :
                               key === 'conversionRate' ? 'Conv. Rate' :
                               key === 'conversionValue' ? 'Conv. Value' :
                               key === 'impressionShare' ? 'Impression Share' :
                               key.charAt(0).toUpperCase() + key.slice(1)}
                              {key === 'keyword' && <span className="text-xs text-gray-500 ml-1">(always visible)</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                )}
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {visibleColumns.keyword && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kw ({campaignKeywords.length})</th>
                        )}
                        {visibleColumns.campaign && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                        )}
                        {visibleColumns.adGroup && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Group</th>
                        )}
                        {visibleColumns.matchType && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Type</th>
                        )}
                        {visibleColumns.impressions && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('impressions')}
                          >
                            <div className="flex items-center justify-end">
                              Impressions
                              <SortArrow column="impressions" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.clicks && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('clicks')}
                          >
                            <div className="flex items-center justify-end">
                              Clicks
                              <SortArrow column="clicks" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.ctr && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('ctr')}
                          >
                            <div className="flex items-center justify-end">
                              CTR
                              <SortArrow column="ctr" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.cost && (
                          <th
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('cost')}
                          >
                            <div className="flex items-center justify-end">
                              Cost
                              <SortArrow column="cost" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.avgCpc && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('avgCpc')}
                          >
                            <div className="flex items-center justify-end">
                              Avg CPC
                              <SortArrow column="avgCpc" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.conversions && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('conversions')}
                          >
                            <div className="flex items-center justify-end">
                              Conversions
                              <SortArrow column="conversions" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.conversionRate && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('conversionRate')}
                          >
                            <div className="flex items-center justify-end">
                              Conv. Rate
                              <SortArrow column="conversionRate" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.cpa && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('cpa')}
                          >
                            <div className="flex items-center justify-end">
                              CPA
                              <SortArrow column="cpa" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.conversionValue && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('conversionValue')}
                          >
                            <div className="flex items-center justify-end">
                              Conv. Value
                              <SortArrow column="conversionValue" />
                            </div>
                          </th>
                        )}
                        {visibleColumns.impressionShare && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('impressionShare')}
                          >
                            <div className="flex items-center justify-end">
                              Impression Share
                              <SortArrow column="impressionShare" />
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getPaginatedKeywords().map((kw, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {visibleColumns.keyword && (
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-left">{kw.keyword}</td>
                          )}
                          {visibleColumns.campaign && (
                            <td className="px-4 py-3 text-sm text-gray-600 text-left">{kw.campaignName}</td>
                          )}
                          {visibleColumns.adGroup && (
                            <td className="px-4 py-3 text-sm text-gray-600">{kw.adGroupName}</td>
                          )}
                          {visibleColumns.matchType && (
                            <td className="px-4 py-3 text-sm text-gray-600 text-left">{formatMatchType(kw.matchType)}</td>
                          )}
                          {visibleColumns.impressions && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(kw.impressions)}</td>
                          )}
                          {visibleColumns.clicks && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(kw.clicks)}</td>
                          )}
                          {visibleColumns.ctr && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPercentage(kw.ctr)}</td>
                          )}
                          {visibleColumns.cost && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(kw.costMicros)}</td>
                          )}
                          {visibleColumns.avgCpc && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(kw.averageCpcMicros)}</td>
                          )}
                          {visibleColumns.conversions && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(kw.conversions)}</td>
                          )}
                          {visibleColumns.conversionRate && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPercentage(kw.conversionRate)}</td>
                          )}
                          {visibleColumns.cpa && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{kw.costPerConversionMicros > 0 ? formatCurrency(kw.costPerConversionMicros) : 'N/A'}</td>
                          )}
                          {visibleColumns.conversionValue && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(kw.conversionValueMicros)}</td>
                          )}
                          {visibleColumns.impressionShare && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{kw.impressionShare !== undefined ? formatPercentage(kw.impressionShare) : 'N/A'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Items per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <div className="flex gap-1">
                        {[20, 50, 100].map((size) => (
                          <button
                            key={size}
                            onClick={() => handleItemsPerPageChange(size)}
                            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                              itemsPerPage === size
                                ? 'bg-blue-600 text-white font-medium'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Page info */}
                    <div className="text-sm text-gray-600">
                      Showing {startItem} to {endItem} of {totalItems} keywords
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
              </div>
            </div>
          </div>
            )}

        {/* Similar Keywords Suggestions - Similar Tab */}
        {activeTab === 'similar' && showSuggestions && similarKeywords.length > 0 && (
          <div className="w-full mb-8">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Similar Keywords ({similarKeywords.length})
                </h2>
                <div className="flex gap-2 items-center">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                    <button
                      onClick={() => setSimilarKeywordsViewMode('table')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        similarKeywordsViewMode === 'table'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setSimilarKeywordsViewMode('grid')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        similarKeywordsViewMode === 'grid'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Grid
                    </button>
                  </div>

                  {/* Selection info */}
                  {selectedSimilarKeywords.size > 0 && (
                    <div className="text-sm text-gray-600 mr-2">
                      {selectedSimilarKeywords.size} selected
                    </div>
                  )}

                  <button
                    onClick={() => copyKeywordsToClipboard(false)}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-all duration-200 text-sm font-medium flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy All
                  </button>
                  {selectedSimilarKeywords.size > 0 && (
                    <button
                      onClick={() => copyKeywordsToClipboard(true)}
                      className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-all duration-200 text-sm font-medium flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Selected
                    </button>
                  )}
                  <button
                    onClick={() => exportKeywords('csv', false)}
                    className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                  >
                    Export All CSV
                  </button>
                  {selectedSimilarKeywords.size > 0 && (
                    <button
                      onClick={() => exportKeywords('csv', true)}
                      className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                    >
                      Export Selected CSV
                    </button>
                  )}
                  <button
                    onClick={() => exportKeywords('json', false)}
                    className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                  >
                    Export All JSON
                  </button>
                  {selectedSimilarKeywords.size > 0 && (
                    <button
                      onClick={() => exportKeywords('json', true)}
                      className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                    >
                      Export Selected JSON
                    </button>
                  )}
                </div>
              </div>

              {similarKeywordsViewMode === 'table' ? (
                <>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isAllCurrentPageSelected()}
                                ref={(el) => {
                                  if (el) el.indeterminate = isAnyCurrentPageSelected() && !isAllCurrentPageSelected();
                                }}
                                onChange={(e) => handleSelectAllSimilarKeywords(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('keyword')}
                          >
                            <div className="flex items-center">
                              Keyword
                              <SimilarKeywordsSortArrow column="keyword" />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('searchVolume')}
                          >
                            <div className="flex items-center justify-end">
                              Search Volume
                              <SimilarKeywordsSortArrow column="searchVolume" />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('competition')}
                          >
                            <div className="flex items-center">
                              Competition
                              <SimilarKeywordsSortArrow column="competition" />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('minCpc')}
                          >
                            <div className="flex items-center justify-end">
                              Min CPC
                              <SimilarKeywordsSortArrow column="minCpc" />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('maxCpc')}
                          >
                            <div className="flex items-center justify-end">
                              Max CPC
                              <SimilarKeywordsSortArrow column="maxCpc" />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('sourceKeyword')}
                          >
                            <div className="flex items-center">
                              Source Keyword
                              <SimilarKeywordsSortArrow column="sourceKeyword" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getPaginatedSimilarKeywords().map((kw, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedSimilarKeywords.has(kw.keyword)}
                                onChange={(e) => handleSimilarKeywordSelect(kw.keyword, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{kw.keyword}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(kw.searchVolume)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                kw.competition === 'HIGH' ? 'bg-red-100 text-red-800' :
                                kw.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {kw.competition}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {kw.lowTopPageBidMicros ? formatCurrency(kw.lowTopPageBidMicros) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {kw.highTopPageBidMicros ? formatCurrency(kw.highTopPageBidMicros) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{kw.sourceKeyword || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <TablePagination
                      rowsPerPageOptions={[25, 50, 100]}
                      component="div"
                      count={similarKeywords.length}
                      rowsPerPage={similarKeywordsRowsPerPage}
                      page={similarKeywordsPage}
                      onPageChange={handleSimilarKeywordsChangePage}
                      onRowsPerPageChange={handleSimilarKeywordsChangeRowsPerPage}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {getPaginatedSimilarKeywords().map((kw, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 break-words">{kw.keyword}</h3>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            kw.competition === 'HIGH' ? 'bg-red-100 text-red-800' :
                            kw.competition === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {kw.competition}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Search Volume:</span>
                            <span className="font-medium text-gray-900">{formatNumber(kw.searchVolume)}</span>
                          </div>
                          {kw.lowTopPageBidMicros && (
                            <div className="flex justify-between">
                              <span>Min CPC:</span>
                              <span className="font-medium text-gray-900">{formatCurrency(kw.lowTopPageBidMicros)}</span>
                            </div>
                          )}
                          {kw.highTopPageBidMicros && (
                            <div className="flex justify-between">
                              <span>Max CPC:</span>
                              <span className="font-medium text-gray-900">{formatCurrency(kw.highTopPageBidMicros)}</span>
                            </div>
                          )}
                          {kw.sourceKeyword && (
                            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                              Suggested from: <span className="font-medium">{kw.sourceKeyword}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <TablePagination
                      rowsPerPageOptions={[25, 50, 100]}
                      component="div"
                      count={similarKeywords.length}
                      rowsPerPage={similarKeywordsRowsPerPage}
                      page={similarKeywordsPage}
                      onPageChange={handleSimilarKeywordsChangePage}
                      onRowsPerPageChange={handleSimilarKeywordsChangeRowsPerPage}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!showCurrentKeywords && !showSuggestions && !fetchingKeywords && !findingSimilar && (
          <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-8">
              <p className="text-gray-600 mb-4">
                Get started by analyzing your Google Ads campaigns to discover new keyword opportunities.
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
                <li className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Fetch all keywords from your active campaigns</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Find similar keywords to expand your reach</span>
                </li>
                <li className="flex items-center space-x-2">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Export suggestions and add them to your campaigns</span>
                </li>
              </ul>
                          </div>
                        </div>
        )}


        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 3000 }}
        />
      </main>
    </div>
  );
};

export default dynamic(() => Promise.resolve(AdsPage), { ssr: false });

