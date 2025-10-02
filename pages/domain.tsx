import React, { useState, useContext, useEffect, useCallback } from "react";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";
import { DomainInfo, VibeType } from "../utils/Definitions";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import mixpanel from "../utils/mixpanel-config";
import { useRouter } from "next/router";
import { useClerk, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";
import DiamondIcon from '@mui/icons-material/Diamond';
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";

// --- Local Storage Rate Limiting Helpers ---
const LOCAL_STORAGE_KEY = 'domainGenerationTimestamps';
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
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
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-4 min-h-screen bg-white">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 font-medium py-2 px-4 rounded-lg inline-flex items-center transition-all duration-200 hover:bg-gray-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>

        <h1 className="text-5xl font-bold text-gray-900 mb-8 tracking-tight">
          Domain <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Generator</span>
        </h1>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Find the perfect domain name that matches your business vision and brand identity
        </p>

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
            <Button
              onClick={() => openSignIn()}
              className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80"
            >
              Sign in / up
            </Button>
          )}
        </Box>

        {/* Parent Grid Container: Columns change conditionally */}
        <div className={`w-full grid grid-cols-1 ${ (loading || generatedDomains.length > 0) ? 'lg:grid-cols-2' : 'lg:grid-cols-1' } gap-10 lg:gap-16 mt-10`}>
          
          {/* Left Column: Form - Spans conditionally */}
          {/* Make sure form inside centers itself using mx-auto */}
          <div className={`lg:col-span-1 ${(loading || generatedDomains.length > 0) ? '' : 'lg:col-span-1' }`}> {/* Simpler: let grid template handle span */} 
            <form onSubmit={generateDomains} className="max-w-xl w-full mx-auto">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-3 w-10 h-10 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">1</span>
                  </div>
                  <p className="text-left font-semibold text-gray-800 text-lg">Describe your business or idea</p>
                </div>
    
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 my-6 p-5 text-gray-700 resize-none transition-all duration-300 text-lg"
                  placeholder="e.g. Boutique Coffee Shop with artisanal roasts and cozy atmosphere"
                />
    
                <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-3 w-10 h-10 flex items-center justify-center shadow-lg">
                    <span className="text-lg font-bold text-white">2</span>
                  </div>
                  <p className="text-left font-semibold text-gray-800 text-lg">Select vibe</p>
                </div>
    
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value as VibeType)}
                  className="w-full rounded-xl border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-4 my-6 transition-all duration-300 text-lg"
                >
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Creative">Creative</option>
                  <option value="Sophisticated">Sophisticated</option>
                </select>
    
                <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-100 mb-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-gray-300 text-blue-500 focus:ring-blue-500 transition-all duration-200"
                      checked={availableOnly}
                      onChange={handleAvailableOnlyChange}
                    />
                    <label className={`text-left font-semibold text-lg ${!isSignedIn || !isPremiumUser ? "text-gray-400" : "text-gray-800"}`}>
                      Only available domains
                    </label>
                    <DiamondIcon sx={{ fontSize: "1.2rem", color: "black" }} />
                  </div>
    
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(true)}
                    className="text-gray-600 hover:text-blue-500 transition-all duration-200 p-2 rounded-lg hover:bg-gray-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
    
                {showAdvancedSettings && (
                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-8 border w-[450px] shadow-xl rounded-xl bg-white">
                      {/* Close button */}
                      <button
                        onClick={() => setShowAdvancedSettings(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
    
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-xl font-bold text-gray-900">
                            Settings
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            Customize your name generation preferences
                          </p>
                        </div>
    
                        {/* Temperature Options */}
                        <div className="space-y-3">
                          <label className="block text-gray-700 font-medium">
                            Name Style
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {["imaginative", "neutral", "reliable"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  setTemperatureOption(option);
                                  mixpanel.track("Temperature Option Set", {
                                    userId: dataUser?.id || "anonymous",
                                    option: option
                                  });
                                }}
                                className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                                  temperatureOption === option
                                    ? "border-black bg-black text-white"
                                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                                }`}
                              >
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
    
                        {/* Domain Extension */}
                        <div className="space-y-3">
                          <label className="block text-gray-700 font-medium">
                            Extension
                          </label>
                          <select
                            id="domainExtension"
                            value={domainExtension}
                            onChange={(e) => {
                              setDomainExtension(e.target.value);
                              mixpanel.track("Domain Extension Set", {
                                userId: dataUser?.id || "anonymous",
                                extension: e.target.value
                              });
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-black focus:ring-black transition-all duration-200"
                          >
                            <option value="">Any</option>
                            <option value=".com">.com</option>
                            <option value=".net">.net</option>
                            <option value=".org">.org</option>
                            <option value=".io">.io</option>
                            <option value=".ai">.ai</option>
                          </select>
                        </div>
    
                        {/* Done Button */}
                        <button
                          onClick={() => setShowAdvancedSettings(false)}
                          className="w-full px-4 py-3 bg-black text-white text-base font-medium rounded-lg hover:bg-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
    
                <button
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold px-8 py-4 w-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <LoadingDots color="white" style="large" />
                      <span>Generating domains...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                      <span>Generate domains</span>
                    </div>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Results - Render conditionally */} 
            {(loading || generatedDomains.length > 0) && (
              <div className="lg:col-span-1">
                <div className="space-y-8">
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
                    <div className="text-center mb-8">
                      <h2 className="text-4xl font-bold text-gray-900 mb-2">
                        {isSignedIn && isPremiumUser ? "Available Domains" : "Generated Domains"}
                      </h2>
                      <p className="text-lg text-gray-600">
                        {isSignedIn && isPremiumUser ? "Ready to register domains" : "Check availability and register"}
                      </p>
                    </div>
                  )}
                  {/* Render list only if not loading AND domains exist */} 
                  {!loading && generatedDomains.length > 0 && (
                      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
                                <span>{isSignedIn && isPremiumUser ? 'Buy Domain' : 'Check Availability'}</span>
                              </button>

                                <button
                                  onClick={() => {
                                    window.open(`/web?domain=${encodeURIComponent(domain.domain)}`, "_blank");
                                  }}
                                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-3 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center justify-center space-x-2 group text-sm w-full sm:w-auto shadow-lg hover:shadow-xl"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                  </svg>
                                  <span>Create Web</span>
                                </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </div>
            )}

        </div> { /* End Parent Grid Container */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
      </main>
    </div>
  );
};

export default DomainPage;
