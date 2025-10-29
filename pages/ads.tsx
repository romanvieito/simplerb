import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from 'next/router';
import { Box, Button } from "@mui/material";
import { TablePagination } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";

// LocalStorage utility functions for saving/loading campaign keywords
const STORAGE_KEY = 'last-campaign-keywords';
const COLUMN_VISIBILITY_KEY = 'ads-table-column-visibility';
const SORT_STATE_KEY = 'ads-table-sort-state';

// Column visibility type
type ColumnVisibilityState = {
  keyword: boolean;
  campaign: boolean;
  adGroup: boolean;
  impressions: boolean;
  clicks: boolean;
  ctr: boolean;
  cost: boolean;
  bid: boolean;
  avgCpc: boolean;
  conversions: boolean;
  conversionRate: boolean;
  cpa: boolean;
  conversionValue: boolean;
  qualityScore: boolean;
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
  sortColumn: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'bid' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'qualityScore' | 'impressionShare' | null;
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
  qualityScore?: number;
}

interface SimilarKeyword {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  sourceKeyword?: string;
}

const AdsPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  
  const [loading, setLoading] = useState(false);
  const [fetchingKeywords, setFetchingKeywords] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [campaignKeywords, setCampaignKeywords] = useState<CampaignKeyword[]>([]);
  const [similarKeywords, setSimilarKeywords] = useState<SimilarKeyword[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Array<{id: string, name: string}>>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [showCurrentKeywords, setShowCurrentKeywords] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Sort state - initialize from localStorage or use defaults
  const [sortColumn, setSortColumn] = useState<'impressions' | 'clicks' | 'ctr' | 'cost' | 'bid' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'qualityScore' | 'impressionShare' | null>(() => {
    const saved = loadSortState();
    return saved?.sortColumn ?? null;
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = loadSortState();
    return saved?.sortDirection ?? 'desc';
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  // Similar keywords view and pagination state
  const [similarKeywordsViewMode, setSimilarKeywordsViewMode] = useState<'grid' | 'table'>('table');
  const [similarKeywordsPage, setSimilarKeywordsPage] = useState(0);
  const [similarKeywordsRowsPerPage, setSimilarKeywordsRowsPerPage] = useState(50);
  const [similarKeywordsSortField, setSimilarKeywordsSortField] = useState<'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'avgCpc' | 'sourceKeyword' | null>(null);
  const [similarKeywordsSortDirection, setSimilarKeywordsSortDirection] = useState<'asc' | 'desc'>('desc');
  const [similarKeywordsCountryCode, setSimilarKeywordsCountryCode] = useState('US');
  const [similarKeywordsLanguageCode, setSimilarKeywordsLanguageCode] = useState('en');
  
  // Default column visibility - all columns visible by default
  const defaultColumnVisibility = {
    keyword: true, // Always visible
    campaign: true,
    adGroup: true,
    impressions: true,
    clicks: true,
    ctr: true,
    cost: true,
    bid: true,
    avgCpc: true,
    conversions: true,
    conversionRate: true,
    cpa: true,
    conversionValue: true,
    qualityScore: true,
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

  // Refs to prevent save loops during initial load
  const isInitialLoad = useRef(true);
  const hasLoadedSavedData = useRef(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

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

  // Load saved campaign keywords on component mount
  useEffect(() => {
    const savedData = loadCampaignKeywords();
    if (savedData) {
      setCampaignKeywords(savedData.campaignKeywords);
      setSelectedCampaignIds(savedData.selectedCampaignIds);
      setAvailableCampaigns(savedData.availableCampaigns);
      setShowCurrentKeywords(true);
      hasLoadedSavedData.current = true;
    }
    isInitialLoad.current = false;
  }, []);

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
    const campaignIdsParam = selectedCampaignIds.length > 0 
      ? `?campaignIds=${selectedCampaignIds.join(',')}`
      : '';

    setFetchingKeywords(true);
    try {
      const response = await fetch(`/api/google-ads/get-campaign-keywords${campaignIdsParam}`, {
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
        const campaignsToSave = (availableCampaigns.length === 0 || campaignIdsParam === '') 
          ? uniqueCampaigns 
          : availableCampaigns;
        
        if (availableCampaigns.length === 0 || campaignIdsParam === '') {
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

  // Initial fetch to get list of campaigns
  const fetchAvailableCampaigns = async () => {
    if (!user?.emailAddresses[0]?.emailAddress || !admin) return;

    try {
      const response = await fetch('/api/google-ads/get-campaign-keywords', {
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
    
    try {
      // Get unique keywords from campaigns
      const uniqueKeywords = Array.from(new Set(campaignKeywords.map(k => k.keyword)));
      
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
              excludeExisting: [], // Don't exclude campaign keywords - we want to find similar ones
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

  const exportKeywords = (format: 'csv' | 'json') => {
    if (similarKeywords.length === 0) {
      toast.error('No keywords to export');
      return;
    }

    if (format === 'csv') {
      const headers = ['Keyword', 'Search Volume', 'Competition', 'Avg CPC', 'Source Keyword'];
      const rows = similarKeywords.map(k => [
        k.keyword,
        k.searchVolume.toString(),
        k.competition,
        k.avgCpcMicros ? `$${(k.avgCpcMicros / 1000000).toFixed(2)}` : 'N/A',
        k.sourceKeyword || ''
      ]);
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `similar-keywords-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      } else {
      const json = JSON.stringify(similarKeywords, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `similar-keywords-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    toast.success(`Exported ${similarKeywords.length} keywords as ${format.toUpperCase()}`);
  };

  const formatCurrency = (micros: number) => {
    return `$${(micros / 1000000).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const handleSort = (column: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'bid' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'qualityScore' | 'impressionShare') => {
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
        case 'bid':
          aValue = a.cpcBidMicros;
          bValue = b.cpcBidMicros;
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
        case 'qualityScore':
          aValue = a.qualityScore || 0;
          bValue = b.qualityScore || 0;
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

  const SortArrow = ({ column }: { column: 'impressions' | 'clicks' | 'ctr' | 'cost' | 'bid' | 'avgCpc' | 'conversions' | 'conversionRate' | 'cpa' | 'conversionValue' | 'qualityScore' | 'impressionShare' }) => {
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
  const handleSimilarKeywordsSort = (field: 'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'avgCpc' | 'sourceKeyword') => {
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
        case 'avgCpc':
          aValue = a.avgCpcMicros || 0;
          bValue = b.avgCpcMicros || 0;
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

  const SimilarKeywordsSortArrow = ({ column }: { column: 'keyword' | 'searchVolume' | 'competition' | 'minCpc' | 'maxCpc' | 'avgCpc' | 'sourceKeyword' }) => {
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

  return (
    <div className="flex w-full flex-col items-center justify-center py-4 min-h-screen bg-white">
      <Head>
        <title>Ads Pilot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

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
            <button className="px-3 py-1 bg-white rounded-md text-sm font-medium text-gray-800 shadow-sm">
              Ads
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
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <DiamondIcon sx={{ mr: 0.2, fontSize: "1rem" }} />
                    Become a Member
                  </Box>
                </Button>
              </form>
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

        <h1 className="text-2xl text-gray-900 mb-3 tracking-tight">
          Ads <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Pilot</span>
        </h1>

        {/* Campaign Selector */}
        {availableCampaigns.length > 0 && (
          <div className="w-full max-w-4xl mx-auto mb-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Select Campaigns to Analyze
                </h3>
                <button
                  onClick={() => {
                    if (selectedCampaignIds.length === availableCampaigns.length) {
                      setSelectedCampaignIds([]);
                    } else {
                      setSelectedCampaignIds(availableCampaigns.map(c => c.id));
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedCampaignIds.length === availableCampaigns.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableCampaigns.map((campaign) => (
                  <label
                    key={campaign.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all"
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
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium flex-1">{campaign.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                {selectedCampaignIds.length === 0 
                  ? 'Select one or more campaigns above. If none selected, all campaigns will be analyzed.'
                  : `${selectedCampaignIds.length} of ${availableCampaigns.length} campaign${availableCampaigns.length !== 1 ? 's' : ''} selected`}
              </p>
                </div>
              </div>
            )}

        {/* Action Buttons */}
        <div className="w-full max-w-4xl mx-auto space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={fetchCampaignKeywords}
              disabled={fetchingKeywords || !admin}
              className="bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
            >
              {fetchingKeywords ? (
                <>
                  <LoadingDots color="white" style="small" />
                  <span>Fetching Keywords...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <span>Analyze {selectedCampaignIds.length > 0 ? `Selected Campaign${selectedCampaignIds.length !== 1 ? 's' : ''}` : 'All Campaigns'}</span>
                </>
              )}
            </button>

            {campaignKeywords.length > 0 && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 font-medium">Location:</label>
                  <select
                    value={similarKeywordsCountryCode}
                    onChange={(e) => setSimilarKeywordsCountryCode(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
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
                    className="bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
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
                <button
                  onClick={findSimilarKeywords}
                  disabled={findingSimilar}
                  className="bg-indigo-600 text-white rounded-lg px-6 py-3 hover:bg-indigo-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
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
                      <span>Find Similar Keywords</span>
                    </>
                  )}
                </button>
              </>
            )}
                    </div>

          {!admin && (
            <p className="text-sm text-gray-500">Admin access required to analyze campaigns</p>
          )}
                    </div>

        {/* Current Keywords */}
        {showCurrentKeywords && campaignKeywords.length > 0 && (
          <div className="w-full mb-8">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
              {/* Column Selector */}
              <div className="mb-4 flex justify-end relative" ref={columnSelectorRef}>
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
                               key === 'avgCpc' ? 'Avg CPC' :
                               key === 'conversionRate' ? 'Conv. Rate' :
                               key === 'conversionValue' ? 'Conv. Value' :
                               key === 'qualityScore' ? 'Quality Score' :
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
                        {visibleColumns.bid && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('bid')}
                          >
                            <div className="flex items-center justify-end">
                              Bid Amount
                              <SortArrow column="bid" />
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
                        {visibleColumns.qualityScore && (
                          <th 
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSort('qualityScore')}
                          >
                            <div className="flex items-center justify-end">
                              Quality Score
                              <SortArrow column="qualityScore" />
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
                          {visibleColumns.bid && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(kw.cpcBidMicros)}</td>
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
                          {visibleColumns.qualityScore && (
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{kw.qualityScore !== undefined ? kw.qualityScore.toFixed(1) : 'N/A'}</td>
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

        {/* Similar Keywords Suggestions */}
        {showSuggestions && similarKeywords.length > 0 && (
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
                  
                  <button
                    onClick={() => exportKeywords('csv')}
                    className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportKeywords('json')}
                    className="bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 transition-all duration-200 text-sm font-medium"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              {similarKeywordsViewMode === 'table' ? (
                <>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
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
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                            onClick={() => handleSimilarKeywordsSort('avgCpc')}
                          >
                            <div className="flex items-center justify-end">
                              Avg CPC
                              <SimilarKeywordsSortArrow column="avgCpc" />
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
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {kw.avgCpcMicros ? formatCurrency(kw.avgCpcMicros) : 'N/A'}
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
                          {kw.avgCpcMicros && (
                            <div className="flex justify-between">
                              <span>Avg CPC:</span>
                              <span className="font-medium text-gray-900">{formatCurrency(kw.avgCpcMicros)}</span>
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

export default AdsPage;

