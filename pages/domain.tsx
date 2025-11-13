import React, { useState, useContext, useEffect, useCallback } from "react";
import { toast, Toaster } from "react-hot-toast";
import DashboardLayout from "../components/DashboardLayout";
import { DomainInfo, VibeType } from "../utils/Definitions";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import mixpanel from "../utils/mixpanel-config";
import { useRouter } from "next/router";
import { useClerk, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import LoginIcon from '@mui/icons-material/Login';
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";

// --- Local Storage Rate Limiting Helpers ---
const LOCAL_STORAGE_KEY = 'domainGenerationTimestamps';
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

// --- Local Storage Domain Search Helpers ---
const DOMAIN_SEARCH_STORAGE_KEY = 'lastDomainSearch';

const getTimestamps = (): number[] => {
  try {
    const storedTimestamps = localStorage.getItem(LOCAL_STORAGE_KEY);
    return storedTimestamps ? JSON.parse(storedTimestamps) : [];
  } catch (error) {
    console.error("Error reading timestamps from local storage:", error);
    return [];
  }
};

const addTimestamp = (timestamp: number) => {
  try {
    const timestamps = getTimestamps();
    // Clean up old timestamps while adding the new one
    const now = Date.now();
    const recentTimestamps = timestamps.filter(ts => (now - ts) < RATE_LIMIT_WINDOW_MS);
    recentTimestamps.push(timestamp);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recentTimestamps));
  } catch (error) {
    console.error("Error saving timestamp to local storage:", error);
  }
};

const checkRateLimit = (): boolean => {
  const now = Date.now();
  const timestamps = getTimestamps();
  const recentTimestamps = timestamps.filter(ts => (now - ts) < RATE_LIMIT_WINDOW_MS);
  // Update storage with only recent timestamps (cleanup)
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recentTimestamps));
  } catch (error) {
     console.error("Error updating timestamps in local storage:", error);
  }
  return recentTimestamps.length >= RATE_LIMIT_COUNT;
};
// --- End Local Storage Rate Limiting Helpers ---

// --- Local Storage Domain Search Functions ---
interface SavedDomainSearch {
  businessDescription: string;
  vibe: VibeType;
  temperatureOption: string;
  domainExtension: string;
  availableOnly: boolean;
  generatedDomains: DomainInfo[];
  filteredDomains: DomainInfo[];
  availabilityChecked: boolean;
  timestamp: number;
}

const saveDomainSearch = (searchData: Omit<SavedDomainSearch, 'timestamp'>) => {
  try {
    const dataToSave: SavedDomainSearch = {
      ...searchData,
      timestamp: Date.now()
    };
    localStorage.setItem(DOMAIN_SEARCH_STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Error saving domain search to local storage:", error);
  }
};

const loadDomainSearch = (): SavedDomainSearch | null => {
  try {
    const stored = localStorage.getItem(DOMAIN_SEARCH_STORAGE_KEY);
    if (!stored) return null;
    
    const data: SavedDomainSearch = JSON.parse(stored);
    
    // Check if data is older than 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > twentyFourHours) {
      clearDomainSearch();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error loading domain search from local storage:", error);
    return null;
  }
};

const clearDomainSearch = () => {
  try {
    localStorage.removeItem(DOMAIN_SEARCH_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing domain search from local storage:", error);
  }
};
// --- End Local Storage Domain Search Functions ---

const DomainPage: React.FC = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedDomains, setGeneratedDomains] = useState<DomainInfo[]>([]);
  const [currentDomain, setCurrentDomain] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filteredDomains, setFilteredDomains] = useState<DomainInfo[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [temperatureOption, setTemperatureOption] = useState("neutral");
  const [domainExtension, setDomainExtension] = useState('');

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error('SBRContext must be used within a SBRProvider');
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

  // Function to fetch user data by email
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

  // Function to initialize page data
  const initPageData = useCallback(async () => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0].emailAddress;
      if (email) {
        try {
          await fetchUserData(email);
          mixpanel.identify(email);
        } catch (error) {
          console.error("Error initializing page data:", error);
          if (process.env.NODE_ENV !== 'production') {
            console.warn("Failed to load user data. Please try refreshing the page.");
          }
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.warn("User email not available");
        }
      }
    } else if (isLoaded && !user) {
      // Reset user data when not signed in
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

  // Load saved domain search data on component mount
  useEffect(() => {
    const savedSearch = loadDomainSearch();
    if (savedSearch) {
      setBusinessDescription(savedSearch.businessDescription);
      setVibe(savedSearch.vibe);
      setTemperatureOption(savedSearch.temperatureOption);
      setDomainExtension(savedSearch.domainExtension);
      setAvailableOnly(savedSearch.availableOnly);
      setGeneratedDomains(savedSearch.generatedDomains);
      setFilteredDomains(savedSearch.filteredDomains);
      setAvailabilityChecked(savedSearch.availabilityChecked);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log("Restored domain search from localStorage:", savedSearch);
      }
    }
  }, []);

  const checkAvailability = async (domainsToCheckInput: DomainInfo[]) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          "Checking availability for:",
          domainsToCheckInput.map((d) => d.domain)
        );
      }
      const domainsToCheck = domainsToCheckInput.map((domainInfo) => domainInfo.domain);

      // Prevent check if no domains passed
      if (domainsToCheck.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log("No domains to check availability for.");
        }
        setAvailabilityChecked(false); // Ensure it's false if no domains
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        const mockAvailabilityResults = domainsToCheckInput.map((domainInfo) => ({
          ...domainInfo, // Keep existing info like favorite status
          available: Math.random() < 0.7,
        }));
        console.log("Mock results:", mockAvailabilityResults);
        setGeneratedDomains(mockAvailabilityResults);
        setFilteredDomains(
          mockAvailabilityResults.filter((domain) => domain.available === true)
        );
        setAvailabilityChecked(true); // Mark as checked after mock update
        return;
      }

      const response = await fetch('/api/check-availability-godaddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainsToCheck }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const availabilityResults = await response.json();
      if (process.env.NODE_ENV !== 'production') {
        console.log("API results:", availabilityResults);
      }

      // Use the passed domainsToCheckInput to map results
      const updatedDomains = domainsToCheckInput.map((domainInfo) => {
        const availabilityInfo = availabilityResults.find((result: { domain: string; available: boolean }) => result.domain === domainInfo.domain);
        return {
          ...domainInfo,
          available: availabilityInfo ? availabilityInfo.available : undefined, // Keep undefined if lookup fails
        };
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log("Updated domains with availability:", updatedDomains);
      }

      setGeneratedDomains(updatedDomains);
      setFilteredDomains(updatedDomains.filter((domain) => domain.available === true)); // Filter strictly for true
      setAvailabilityChecked(true); // Mark as checked after API update

      // Save updated domains to localStorage
      saveDomainSearch({
        businessDescription,
        vibe,
        temperatureOption,
        domainExtension,
        availableOnly,
        generatedDomains: updatedDomains,
        filteredDomains: updatedDomains.filter((domain) => domain.available === true),
        availabilityChecked: true
      });

    } catch (error) {
      console.error("Error checking domain availability:", error);
      setAvailabilityChecked(false); // Reset on error to allow potential retry
    }
  };

  const generateDomains = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if business description is entered
    if (!businessDescription.trim()) {
      toast.error("Please enter a business description to generate domains!", {
        duration: 3000,
        position: 'top-center',
      });
      return;
    }

    // --- Rate Limit Check for Free Users ---
    if (!isSignedIn || !isPremiumUser) {
      if (checkRateLimit()) {
        toast.error(`Free users are limited to ${RATE_LIMIT_COUNT} generations every 3 hours. Sign in and upgrade for unlimited access!`);
        mixpanel.track("Rate Limit Hit", {
          userId: dataUser?.id || "anonymous",
          feature: "Domain Generation",
          isSignedIn: isSignedIn
        });
        return; // Stop execution if limit is reached
      }
    }
    // --- End Rate Limit Check ---

    setLoading(true);
    setGeneratedDomains([]);
    setFilteredDomains([]); // Reset filtered domains as well
    setAvailabilityChecked(false); // Reset check status for new generation

    let generatedResults: DomainInfo[] = [];
    let tempGeneratedDomains = "";

    try {
      const prompt = `
        Role: You are Seth Godin.
        Objective: Generate 5 memorable, brief, and simple domain names ${domainExtension !="" ? `(extension: ${domainExtension}) ` : ""}based on the following input:
        Client's input: ${businessDescription}
        Vibe: ${vibe}
        
        Good Examples:
        - Apple.com: Easy to spell and pronounce.
        - JetBlue.com: Descriptive and easy to remember.
        - Amazon.com: Short, memorable, and now synonymous with online shopping.

        Bad Examples:
        - Axelon.com: Sounds like a common English word but isn't, leading to potential confusion.
        - Altus.com: Lacks immediate brandability.
        - Prius.com: Pronunciation challenges may hinder global brand recall.
        
        Return only the domain names, one per line.
      `;

      const temperatureMap = {
        imaginative: 0.9,
        neutral: 0.7,
        reliable: 0.5,
      };

      const temperature = temperatureMap[temperatureOption as keyof typeof temperatureMap];

      // --- Add Timestamp After Successful Start (but before API call potentially) ---
      // We add it here to count the attempt, even if the API call fails later.
      if (!isSignedIn || !isPremiumUser) {
        addTimestamp(Date.now());
      }
      // --- End Add Timestamp ---

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ptemp: temperature, ptop: 1 }),
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
            tempGeneratedDomains += text;
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

      const tempDomainNamesText = tempGeneratedDomains
        .split("\n")
        .map((domain) => domain.replace(/^\d+\.\s*/, "").trim())
        .filter((domain) => domain !== "");

      generatedResults = tempDomainNamesText.map((domain) => ({
        domain,
        available: undefined,
        favorite: false,
      }));

      if (process.env.NODE_ENV !== 'production') {
        console.log("Generated domains:", generatedResults);
      }
      setGeneratedDomains(generatedResults);

      // Save generated domains to localStorage
      saveDomainSearch({
        businessDescription,
        vibe,
        temperatureOption,
        domainExtension,
        availableOnly,
        generatedDomains: generatedResults,
        filteredDomains: [],
        availabilityChecked: false
      });

      mixpanel.track("Generated Domains", {
        businessDescription,
        vibe,
        availableOnly,
        userId: dataUser?.id || "anonymous",
        results: generatedResults.map((domain) => domain.domain),
      });

      // Check availability immediately if premium user has the box checked
      if (isSignedIn && isPremiumUser && availableOnly) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            "Premium user and availableOnly=true, checking availability..."
          );
        }
        await checkAvailability(generatedResults);
        } else {
        // If not checking availability now, ensure filtered list is empty
        // and availability is marked as not checked for this batch.
        if (process.env.NODE_ENV !== 'production') {
          console.log("Not checking availability immediately.");
        }
        setFilteredDomains([]); // Start with empty filtered list if not checking
        setAvailabilityChecked(false);
        
        // Update localStorage with the current state
        saveDomainSearch({
          businessDescription,
          vibe,
          temperatureOption,
          domainExtension,
          availableOnly,
          generatedDomains: generatedResults,
          filteredDomains: [],
          availabilityChecked: false
        });
      }

    } catch (error) {
      console.error("An error occurred during generation:", error);
      toast.error("An error occurred while generating domains. Please try again.");
      setAvailabilityChecked(false); // Reset check status on error
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAvailability = (domain: string) => {
    const cleanDomainName = domain.replace(/^\d+\.\s*/, "");
    const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${cleanDomainName}`;
    window.open(namecheapUrl, "_blank");

    mixpanel.track("Check Domain Availability", {
      domain: cleanDomainName,
      source: "domain-page",
    });

  };

  const generateWebsiteForDomain = async (domain: string) => {
    // Check if user is signed in and premium
    if (!isSignedIn) {
      toast.error("Please sign in to generate websites");
      openSignIn();
      return;
    }

    if (!isPremiumUser) {
      toast((t) => (
        <div className="flex flex-col items-center p-4">
          <div className="flex items-center mb-4">
            <DiamondIcon className="text-black mr-2" sx={{ fontSize: "1.5rem" }} />
            <h3 className="text-xl font-bold">Premium Feature</h3>
          </div>
          <p className="mb-4 text-gray-600 text-center">
            Generate websites instantly!<br/>
            <span className="text-sm">Plus get access to all premium features.</span>
          </p>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                mixpanel.track("Become a Member Click", {
                  source: "Generate Website from Domain",
                });
                const form = document.querySelector('form[action="/api/checkout_sessions"]');
                if (form instanceof HTMLFormElement) {
                  form.submit();
                }
              }}
              className="bg-black text-white font-medium px-6 py-2.5 rounded-xl hover:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <DiamondIcon className="mr-2" />
              Become a Member
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-100 text-gray-600 font-medium px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ), {
        duration: 15000,
        position: 'top-center',
      });
      return;
    }

    // Generate website description based on domain and business description
    const websiteDescription = businessDescription 
      ? `${businessDescription} - Professional website for ${domain}`
      : `Professional website for ${domain}`;

    // Open web page with auto-generation
    const webUrl = `/web?domain=${encodeURIComponent(domain)}&description=${encodeURIComponent(websiteDescription)}&autoGenerate=true`;
    window.open(webUrl, "_blank");

    mixpanel.track("Generate Website from Domain", {
      domain: domain,
      businessDescription: businessDescription,
      source: "domain-page",
    });
  };

  const handleSubsStarterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    mixpanel.track("Become a Member Click", {
      plan_subscription: 'STARTER',
    });  
    window.gtag && window.gtag('event', 'conversion', {
      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9',
    });

    const form = event.currentTarget.form;
    if (form) {
      form.submit();
    } else {
      console.error("Form not found");
    }
  };

  const handleAvailableOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    console.log(`AvailableOnly checkbox changed to: ${isChecked}`);
    mixpanel.track("Available Only Checkbox Changed", {
      checked: isChecked,
      isPremiumUser: isSignedIn && isPremiumUser,
      isSignedIn: isSignedIn,
    });

    if (isSignedIn && isPremiumUser) {
      setAvailableOnly(isChecked);
      // If user checks the box now, and we have domains generated but haven't checked them yet
      if (isChecked && generatedDomains.length > 0 && !availabilityChecked) {
        console.log(
          "Checkbox checked by premium user, triggering availability check..."
        );
        // Pass the current state here, as it should be stable
        checkAvailability(generatedDomains);
      }
      
      // Save the updated availableOnly state
      if (generatedDomains.length > 0) {
        saveDomainSearch({
          businessDescription,
          vibe,
          temperatureOption,
          domainExtension,
          availableOnly: isChecked,
          generatedDomains,
          filteredDomains,
          availabilityChecked
        });
      }
    } else {
      // Logic for non-premium user or anonymous user trying to check the box (toast message)
      toast((t) => (
        <div className="flex flex-col items-center p-4">
          <div className="flex items-center mb-4">
            <DiamondIcon className="text-black mr-2" sx={{ fontSize: "1.5rem" }} />
            <h3 className="text-xl font-bold">Premium Feature</h3>
          </div>
          <p className="mb-4 text-gray-600 text-center">
            See only available domains instantly!<br/>
            <span className="text-sm">Plus get access to all premium features.</span>
          </p>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                mixpanel.track("Become a Member Click", {
                  source: "Available Only Checkbox",
                });
                if (isSignedIn) {
                  const form = document.querySelector('form[action="/api/checkout_sessions"]');
                  if (form instanceof HTMLFormElement) {
                    form.submit();
                  }
                } else {
                  openSignIn();
                }
              }}
              className="bg-black text-white font-medium px-6 py-2.5 rounded-xl hover:bg-black/80 flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <DiamondIcon className="mr-2" />
              {isSignedIn ? 'Become a Member' : 'Sign in to Upgrade'}
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-100 text-gray-600 font-medium px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ), {
        duration: 15000,
        position: 'top-center',
      });
    }
  };

  return (
    <DashboardLayout title="Domain">
      <div className="flex flex-1 w-full flex-col items-center justify-center text-center">

        <h1 className="text-2xl text-gray-900 mb-3 tracking-tight">
          Domain <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Generator</span>
        </h1>

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
                  onClick={handleSubsStarterClick}
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

        {/* Main Input Area */}
        <div className="w-full max-w-4xl mx-auto mt-8">
          <form onSubmit={generateDomains} className="space-y-6">
            {/* Integrated Input Area with Action Bar */}
            <div className="relative bg-white rounded-2xl border-2 border-gray-200 shadow-sm focus-within:border-blue-500 focus-within:ring-blue-500 transition-all duration-300">
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={4}
                className="w-full bg-transparent p-6 pb-20 text-gray-700 resize-none transition-all duration-300 text-lg placeholder-gray-400 rounded-2xl border-0 focus:outline-none focus:ring-0"
                placeholder="Describe your business idea... e.g. Boutique Coffee Shop with artisanal roasts and cozy atmosphere"
              />
              
              {/* Integrated Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gray-50 rounded-b-2xl p-4 border-t border-gray-100 overflow-visible">
                <div className="flex items-center space-x-3 overflow-visible">
                  {/* Vibe Dropdown */}
                  <div className="relative overflow-visible">
                    <select
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value as VibeType)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-sm appearance-none pr-8"
                    >
                      <option value="Professional">Professional</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Creative">Creative</option>
                      <option value="Sophisticated">Sophisticated</option>
                    </select>
                  </div>

                  {/* Extension Dropdown */}
                  <div className="relative overflow-visible">
                    <select
                      value={domainExtension}
                      onChange={(e) => {
                        setDomainExtension(e.target.value);
                        mixpanel.track("Domain Extension Set", {
                          userId: dataUser?.id || "anonymous",
                          extension: e.target.value
                        });
                      }}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-sm appearance-none pr-8"
                    >
                      <option value="">Any</option>
                      <option value=".com">.com</option>
                      <option value=".net">.net</option>
                      <option value=".org">.org</option>
                      <option value=".io">.io</option>
                      <option value=".ai">.ai</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-2 border-gray-300 text-blue-500 focus:ring-blue-500 transition-all duration-200"
                      checked={availableOnly}
                      onChange={handleAvailableOnlyChange}
                    />
                    {/* <DiamondIcon sx={{ fontSize: "1rem", color: "black" }} /> */}
                    <label className={`text-sm font-medium ${!isSignedIn || !isPremiumUser ? "text-gray-400" : "text-gray-700"}`}>
                      Only available domains
                    </label>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !businessDescription.trim()}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <>
                        <LoadingDots color="white" style="small" />
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612l-3.96 4.158a.75.75 0 11-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158v10.638A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>


        {/* Results Section */}
        {(loading || generatedDomains.length > 0) && (
          <div className="w-full max-w-4xl mx-auto mt-8">
            <div className="space-y-8">
              {/* Clear Saved Search Button */}
              {generatedDomains.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      clearDomainSearch();
                      setBusinessDescription("");
                      setGeneratedDomains([]);
                      setFilteredDomains([]);
                      setAvailabilityChecked(false);
                      setAvailableOnly(false);
                      toast.success("Saved search cleared");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center space-x-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Clear saved search</span>
                  </button>
                </div>
              )}
              {loading && (
                 <div className="space-y-6">
                   <div className="text-center">
                     <div className="h-8 w-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mx-auto mb-2"></div>
                     <div className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse mx-auto"></div>
                   </div>
                   {[...Array(3)].map((_, index) => (
                     <div key={index} className="flex flex-col justify-between bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200 h-full animate-pulse">
                        <div className="flex-grow mb-4">
                          <div className="h-8 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg mb-4"></div>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-auto">
                          <div className="h-12 flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
                          <div className="h-12 flex-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
                        </div>
                     </div>
                    ))}
                 </div>
              )}
              
              {!loading && generatedDomains.length > 0 && (
                  <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {(availableOnly && isSignedIn && isPremiumUser ? filteredDomains : generatedDomains).map((domain, index) => (
                      <li
                        key={index}
                        className="flex flex-col justify-stretch items-center bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 h-full group"
                      >
                        <div className="flex-grow mb-4">
                           <span className="text-2xl font-bold text-gray-800 block break-words group-hover:text-blue-600 transition-colors duration-200">{domain.domain}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-auto items-center justify-center w-full">
                          <button
                            onClick={() => handleCheckAvailability(domain.domain)}
                            className="bg-gray-100 text-gray-800 rounded-xl px-4 py-3 hover:bg-gray-200 transition-all duration-200 font-semibold flex items-center justify-center space-x-2 group text-sm w-full sm:w-auto"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                            </svg>
                            <span>{isSignedIn && isPremiumUser ? 'Buy' : 'Check Availability'}</span>
                          </button>

                            <button
                              onClick={() => {
                                // Directly generate website for the domain
                                generateWebsiteForDomain(domain.domain);
                              }}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center justify-center space-x-2 group text-sm w-full sm:w-auto shadow-lg hover:shadow-xl"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                              </svg>
                              <span>Preview</span>
                            </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        )}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
      </div>
    </DashboardLayout>
  );
};

export default DomainPage;
